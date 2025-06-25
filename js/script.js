// DOMContentLoaded — Inicializações e segurança de carregamento
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init] DOM totalmente carregado.");

    // Botão "voltar ao topo"
    const scrollUpBtn = document.getElementById('scrollUpBtn');
    if (scrollUpBtn) {
        window.onscroll = function () {
            scrollUpBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
        };
        scrollUpBtn.onclick = function () {
            console.log("[Scroll] Botão clicado. Subir para o topo.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        console.log("[Init] Scroll to top button setup concluído.");
    } else {
        console.warn("[Init] Botão scrollUpBtn não encontrado no DOM.");
    }

    // Idioma
    const savedLang = localStorage.getItem("selectedLang") || "pt";
    changeLanguage(savedLang);

    // Galeria
    loadGallery();

    // Testemunhos
    loadTestemunhos();

    // Vídeo de fundo responsivo
    const isLandscape = window.innerWidth > window.innerHeight;
    const isMobile = window.innerWidth < 768;

    const videoSrc = isMobile && !isLandscape
        ? 'assets/video/mobile-video.mp4'
        : 'assets/video/desktop-video.mp4';

    const video = document.getElementById('bg-video');
    if (video) {
        const source = document.createElement('source');
        source.setAttribute('src', videoSrc);
        source.setAttribute('type', 'video/mp4');
        video.innerHTML = '';
        video.appendChild(source);
        video.load();
        console.log(`[Video] Video carregado: ${videoSrc}`);
    }
});

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
    if (typeof translations === 'undefined') {
        console.error("[i18n] Objeto 'translations' não está definido!");
        return;
    }

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

// Submissão de formulário com reCAPTCHA v3 + Modal
const form = document.getElementById("contactForm");
if (form) {
    form.addEventListener("submit", function (e) {
        console.log("[Form] Submissão iniciada.");
        e.preventDefault();

        if (typeof grecaptcha === 'undefined') {
            console.error("[Form] grecaptcha não carregado.");
            alert("Erro de verificação. Por favor tente mais tarde.");
            return;
        }

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
}

// Carregamento automático da galeria com layout quadrado e zoom
async function loadGallery() {
    console.log("[Galeria] Início do carregamento via Cloudflare Worker.");
    const galleryContainer = document.getElementById("gallery-container");
    const spinner = document.getElementById("gallery-spinner");

    galleryContainer.innerHTML = ''; // limpar antes de carregar

    try {
        const response = await fetch("https://aurea-drive.vonricky940.workers.dev/");
        const images = await response.json();

        if (!images || images.length === 0) {
            throw new Error("Nenhuma imagem recebida do Worker.");
        }

        images.forEach(file => {
            const imgUrl = file.url;

            const col = document.createElement("div");
            col.className = "col-12 col-sm-6 col-md-4 col-lg-3 mb-4";

            const wrapper = document.createElement("div");
            wrapper.className = "gallery-image";

            const a = document.createElement("a");
            a.href = imgUrl;
            a.className = "glightbox";
            a.setAttribute("data-gallery", "aurea-gallery");
            a.addEventListener("click", e => e.preventDefault());

            const img = document.createElement("img");
            img.src = imgUrl;
            img.alt = file.name;
            img.loading = "lazy";
            img.className = "gallery-img";

            a.appendChild(img);
            wrapper.appendChild(a);
            col.appendChild(wrapper);
            galleryContainer.appendChild(col);
        });

        if (window.GLightbox) {
            GLightbox({ selector: '.glightbox' });
            console.log("[Galeria] GLightbox inicializado (Worker).");
        }

        console.log("[Galeria] Imagens carregadas com sucesso do Worker.");
    } catch (error) {
        console.warn("[Galeria] Erro ao carregar via Worker. A carregar fallback local...", error);

        for (let i = 1; i <= 6; i++) {
            const imgUrl = `assets/img/galeria/img${i}.jpg`;

            const col = document.createElement("div");
            col.className = "col-12 col-sm-6 col-md-4 col-lg-3 mb-4";

            const wrapper = document.createElement("div");
            wrapper.className = "gallery-image";

            const a = document.createElement("a");
            a.href = imgUrl;
            a.className = "glightbox";
            a.setAttribute("data-gallery", "aurea-gallery");
            a.addEventListener("click", e => e.preventDefault());

            const img = document.createElement("img");
            img.src = imgUrl;
            img.alt = `Imagem ${i}`;
            img.loading = "lazy";
            img.className = "gallery-img";

            a.appendChild(img);
            wrapper.appendChild(a);
            col.appendChild(wrapper);
            galleryContainer.appendChild(col);
        }

        if (window.GLightbox) {
            GLightbox({ selector: '.glightbox' });
            console.log("[Galeria] Fallback com GLightbox inicializado.");
        }

        console.log("[Galeria] Fallback local carregado com sucesso.");
    } finally {
        spinner.style.display = "none";
    }
}

// Carregamento dos testemunhos no carrossel
async function loadTestemunhos() {
    console.log("[Testemunhos] A carregar...");

    const container = document.getElementById("testemunhos-container");
    if (!container) return console.warn("[Testemunhos] Container não encontrado.");

    try {
        const response = await fetch("assets/testemunhos.json");
        const testemunhos = await response.json();

        if (!Array.isArray(testemunhos) || testemunhos.length === 0) {
            throw new Error("Nenhum testemunho disponível.");
        }

        container.innerHTML = ""; // limpar

        testemunhos.forEach((t) => {
            const slide = document.createElement("div");
            slide.className = "swiper-slide";

            const estrelas = '★'.repeat(t.estrelas) + '☆'.repeat(5 - t.estrelas);

            slide.innerHTML = `
  <div class="testemunho-card">
    <div class="testemunho-estrelas">${estrelas}</div>
    <p class="testemunho-comentario">"${t.comentario}"</p>
    <div class="testemunho-nome">– ${t.nome}</div>
    <div class="testemunho-data">${t.data}</div>
  </div>
`;


            container.appendChild(slide);
        });

        new Swiper(".testimonials-swiper", {
            slidesPerView: 1,
            spaceBetween: 30,
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            breakpoints: {
                768: {
                    slidesPerView: 2
                },
                992: {
                    slidesPerView: 3
                }
            }
        });


        console.log("[Testemunhos] Carregados com Swiper.");
    } catch (err) {
        console.error("[Testemunhos] Erro ao carregar:", err.message);
    }
}

