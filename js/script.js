// Botão "voltar ao topo"
console.log("[Init] Scroll to top button setup iniciado.");
const scrollUpBtn = document.getElementById('scrollUpBtn');
window.onscroll = function () {
    scrollUpBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
};
scrollUpBtn.onclick = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
console.log("[Init] Scroll to top button setup concluído.");

// Função para mudar idioma
function changeLanguage(lang) {
    console.log(`[Language] A mudar para: ${lang}`);
    localStorage.setItem("selectedLang", lang);
    setLanguage(lang);

    document.querySelectorAll(".language-selector button").forEach((btn) => {
        btn.classList.remove("active-lang");
        if (btn.textContent.toLowerCase() === lang) {
            btn.classList.add("active-lang");
        }
    });
}

// Aplicar traduções com base na língua
function setLanguage(lang) {
    console.log(`[i18n] A aplicar traduções para: ${lang}`);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const text = translations[lang]?.[key];

        if (text !== undefined) {
            if (el.classList.contains("html-i18n")) {
                el.innerHTML = text;
            } else {
                el.textContent = text;
            }
        } else {
            console.warn(`[i18n] Tradução não encontrada para chave: ${key}`);
        }
    });

    document.querySelectorAll("option[data-i18n]").forEach((opt) => {
        const key = opt.getAttribute("data-i18n");
        const text = translations[lang]?.[key];

        if (text !== undefined) {
            opt.textContent = text;
        }
    });
}

// Submissão de formulário com reCAPTCHA + Modal
const form = document.getElementById("contactForm");
form.addEventListener("submit", function (e) {
    console.log("[Form] Submissão iniciada.");
    e.preventDefault();

    grecaptcha.ready(function () {
        console.log("[Form] reCAPTCHA pronto. Executando...");
        grecaptcha.execute('6Ldu5WcrAAAAAGD6FpjV029uN38EviyFVu9vlBrs', { action: 'submit' }).then(function (token) {
            console.log("[Form] Token reCAPTCHA recebido.");
            document.getElementById('g-recaptcha-response').value = token;

            fetch(form.action, {
                method: "POST",
                body: new FormData(form),
            }).then(() => {
                console.log("[Form] Formulário enviado com sucesso.");
                const modal = new bootstrap.Modal(document.getElementById("successModal"));
                modal.show();
                form.reset();
            }).catch((err) => {
                console.error("[Form] Erro ao enviar:", err);
                alert("Erro ao enviar. Por favor tente novamente mais tarde.");
            });
        });
    });
});

// Carregamento automático da galeria
const folderId = "10ZgBHUh9g6PBAR0I73PHuXfaWrqQmfeW";
const apiKey = "AIzaSyC9ifnZYl7dL8rXaaoMEfjSZ3qyXBHsh0c";

async function loadGallery() {
    console.log("[Galeria] Início do carregamento.");
    const galleryContainer = document.getElementById("gallery-container");
    const spinner = document.getElementById("gallery-spinner");

    try {
        const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'+and+trashed=false&key=${apiKey}&fields=files(id,name)`;
        console.log(`[Galeria] URL da API: ${url}`);

        const res = await fetch(url);
        const data = await res.json();

        console.log("[Galeria] Resposta da API:", data);

        if (!data.files || data.files.length === 0) {
            console.warn("[Galeria] Nenhuma imagem encontrada.");
            spinner.innerHTML = `<p data-i18n="gallery.empty">Nenhuma imagem disponível.</p>`;
            return;
        }

        data.files.forEach(file => {
            const imgUrl = `https://drive.google.com/uc?id=${file.id}`;
            console.log(`[Galeria] Imagem carregada: ${imgUrl}`);

            const col = document.createElement("div");
            col.className = "col-12 col-sm-6 col-md-4 col-lg-3 gallery-image";

            const a = document.createElement("a");
            a.href = imgUrl;
            a.setAttribute("data-lightbox", "aurea-gallery");
            a.setAttribute("data-title", file.name);

            const img = document.createElement("img");
            img.src = imgUrl;
            img.alt = file.name;
            img.loading = "lazy";

            a.appendChild(img);
            col.appendChild(a);
            galleryContainer.appendChild(col);
        });

        console.log("[Galeria] Todas as imagens renderizadas com sucesso.");
    } catch (error) {
        console.error("[Galeria] Erro ao carregar a galeria:", error);
        spinner.innerHTML = `<p data-i18n="gallery.error">Erro ao carregar a galeria. Tente novamente mais tarde.</p>`;
    } finally {
        spinner.style.display = "none";
    }
}

// DOMContentLoaded — inicializações
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init] DOM totalmente carregado.");

    // Vídeo de fundo
    const isLandscape = window.innerWidth > window.innerHeight;
    const isMobile = window.innerWidth < 768;

    const videoSrc = isMobile && !isLandscape
        ? 'assets/video/mobile-video.mp4'
        : 'assets/video/desktop-video.mp4';

    console.log(`[Video] Dispositivo: ${isMobile ? "Mobile" : "Desktop"}, Orientação: ${isLandscape ? "Landscape" : "Portrait"}`);
    console.log(`[Video] Vídeo selecionado: ${videoSrc}`);

    const video = document.getElementById('bg-video');
    const source = document.createElement('source');
    source.setAttribute('src', videoSrc);
    source.setAttribute('type', 'video/mp4');
    video.innerHTML = '';
    video.appendChild(source);
    video.load();
    console.log("[Video] Vídeo carregado com sucesso.");

    // Idioma
    const savedLang = localStorage.getItem("selectedLang") || "pt";
    changeLanguage(savedLang);

    // Galeria
    loadGallery();
});
