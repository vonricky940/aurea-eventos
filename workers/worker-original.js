export default {
  async fetch(request, env, ctx) {
    const cloudName = "dg0f3wvwi";
    const apiKey = "855659128432158";
    const apiSecret = "RwDdyXUt5TEs50IqD12oEkdV_Kk";

    const apiUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?max_results=50`;

    const auth = btoa(`${apiKey}:${apiSecret}`);

    try {
      const res = await fetch(apiUrl, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });

      if (!res.ok) {
        throw new Error("Erro ao obter imagens da Cloudinary");
      }

      const data = await res.json();

      const images = data.resources.map(img => ({
        name: img.public_id.split("/").pop(),
        url: `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto,w_800/${img.public_id}.${img.format}`
      }));

      return new Response(JSON.stringify(images), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "https://aureaeventos.com"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}
