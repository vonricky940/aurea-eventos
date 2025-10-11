// Cloudflare Worker que serve dois propósitos:
// 1) Fornecer a lista de imagens a partir da API da Cloudinary (rota padrão GET).
// 2) Aplicar validações anti-spam e reencaminhar o formulário para o Google Forms (rota POST /contact).

const resolveOrigin = (env, request) => {
    const configured = env.ALLOWED_ORIGIN;
    if (!configured || configured === "*") return "*";

    const incoming = request.headers.get("Origin") || "";
    const allowed = configured.split(",").map((item) => item.trim()).filter(Boolean);

    if (incoming && allowed.includes(incoming)) return incoming;
    return allowed[0] || "*";
};

const createCorsHeaders = (origin, allowMethods = "GET,POST,OPTIONS") => ({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": allowMethods,
    "Access-Control-Allow-Headers": "Content-Type,X-Form-Started",
});

const jsonResponse = (body, status, origin) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...createCorsHeaders(origin),
        },
    });

const handleOptions = (origin) =>
    new Response(null, {
        status: 204,
        headers: createCorsHeaders(origin),
    });

const handleGallery = async (request, env, origin) => {
    const cloudName = env.CLOUDINARY_CLOUD_NAME || "dg0f3wvwi";
    const apiKey = env.CLOUDINARY_API_KEY || "855659128432158";
    const apiSecret = env.CLOUDINARY_API_SECRET || "RwDdyXUt5TEs50IqD12oEkdV_Kk";
    const resourceType = env.CLOUDINARY_RESOURCE_TYPE || "image";
    const maxResults = env.CLOUDINARY_MAX_RESULTS || "50";
    const deliveryParams = env.CLOUDINARY_DELIVERY_PARAMS || "f_auto,q_auto,w_800";
    const folderPrefix = env.CLOUDINARY_FOLDER ? `&prefix=${encodeURIComponent(env.CLOUDINARY_FOLDER)}` : "";

    const apiUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/upload?max_results=${maxResults}${folderPrefix}`;
    const auth = "Basic " + btoa(`${apiKey}:${apiSecret}`);

    try {
        const res = await fetch(apiUrl, {
            headers: { Authorization: auth },
        });

        if (!res.ok) {
            console.error("[Worker] Erro ao obter imagens da Cloudinary:", res.status);
            return jsonResponse({ error: "CLOUDINARY_FETCH_FAILED" }, 502, origin);
        }

        const data = await res.json();

        const images = (data.resources || []).map((img) => ({
            name: img.public_id?.split("/")?.pop() || img.public_id,
            url: `https://res.cloudinary.com/${cloudName}/image/upload/${deliveryParams}/${img.public_id}.${img.format}`,
        }));

        return new Response(JSON.stringify(images), {
            headers: {
                "Content-Type": "application/json",
                ...createCorsHeaders(origin, "GET,OPTIONS"),
            },
        });
    } catch (err) {
        console.error("[Worker] Exceção ao consultar Cloudinary:", err);
        return jsonResponse({ error: "CLOUDINARY_EXCEPTION" }, 500, origin);
    }
};

const handleContact = async (request, env, origin) => {
    const honeypotField = env.HONEYPOT_FIELD || "aurea_contact_hp";
    const startField = env.START_FIELD || "form_start_ms";
    const googleFormEndpoint =
        env.GOOGLE_FORM_ACTION ||
        "https://docs.google.com/forms/d/e/1FAIpQLSdfRjq2UcHtCGnHlZjzLY3TAxaPL54HBLlcVGivBDES9T00mg/formResponse";
    const minDurationMs = Number(env.MIN_FORM_DURATION_MS || "4000");
    const minSubmitIntervalMs = Number(env.MIN_SUBMIT_INTERVAL_MS || "15000");

    let formData;
    try {
        formData = await request.formData();
    } catch {
        return jsonResponse({ success: false, error: "INVALID_FORM_DATA" }, 400, origin);
    }

    if (!formData) {
        return jsonResponse({ success: false, error: "EMPTY_FORM_DATA" }, 400, origin);
    }

    const honeypotValue = (formData.get(honeypotField) || "").toString().trim();
    if (honeypotValue) {
        console.warn("[Worker] Honeypot acionado.");
        return jsonResponse({ success: false, error: "HONEYPOT_TRIGGERED" }, 400, origin);
    }

    const startedHeader = request.headers.get("X-Form-Started");
    const startedFieldValue = formData.get(startField);
    let clientStartedAt = Number(startedHeader || startedFieldValue);
    if (!Number.isFinite(clientStartedAt)) {
        clientStartedAt = Date.now();
    }

    const elapsed = Date.now() - clientStartedAt;
    if (elapsed < minDurationMs) {
        console.warn("[Worker] Submissão demasiado rápida:", elapsed);
        return jsonResponse({ success: false, error: "TOO_FAST", elapsed }, 429, origin);
    }

    const kv = env.FORM_SPAM_KV;
    const clientIp = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For");
    if (kv && clientIp) {
        const rateKey = `rl:${clientIp}`;
        const lastSubmission = Number(await kv.get(rateKey));
        const now = Date.now();

        if (Number.isFinite(lastSubmission) && now - lastSubmission < minSubmitIntervalMs) {
            console.warn("[Worker] Rate limit atingido para IP:", clientIp);
            return jsonResponse({ success: false, error: "RATE_LIMITED" }, 429, origin);
        }

        const ttlSeconds = Math.max(Math.ceil((minSubmitIntervalMs * 2) / 1000), 60);
        await kv.put(rateKey, String(now), { expirationTtl: ttlSeconds });
    }

    const forwardParams = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
        if (key === honeypotField || key === startField) continue;
        if (typeof value === "string") {
            forwardParams.append(key, value);
        } else if (value instanceof File) {
            // Google Forms não aceita ficheiros por este endpoint. Ignorar para evitar falhas.
            continue;
        } else {
            forwardParams.append(key, String(value));
        }
    }

    const forwardResponse = await fetch(googleFormEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: forwardParams.toString(),
    });

    if (!forwardResponse.ok && forwardResponse.type !== "opaqueredirect") {
        console.error("[Worker] Falha ao submeter para o Google Forms:", forwardResponse.status);
        return jsonResponse({ success: false, error: "GOOGLE_FORM_ERROR", status: forwardResponse.status }, 502, origin);
    }

    return jsonResponse({ success: true }, 200, origin);
};

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = resolveOrigin(env, request);
        const path = url.pathname.replace(/\/+$/, "") || "/";

        if (request.method === "OPTIONS") {
            return handleOptions(origin);
        }

        if (path === "/contact") {
            if (request.method !== "POST") {
                return jsonResponse({ success: false, error: "METHOD_NOT_ALLOWED" }, 405, origin);
            }
            return handleContact(request, env, origin);
        }

        if (request.method !== "GET") {
            return jsonResponse({ success: false, error: "METHOD_NOT_ALLOWED" }, 405, origin);
        }

        return handleGallery(request, env, origin);
    },
};
