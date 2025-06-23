// Botão "voltar ao topo"
const scrollUpBtn = document.getElementById('scrollUpBtn');
window.onscroll = function () {
    scrollUpBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
};
scrollUpBtn.onclick = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Função para mudar idioma
function changeLanguage(lang) {
    // Gravar no localStorage
    localStorage.setItem("selectedLang", lang);
    setLanguage(lang);

    // Destacar botão ativo
    document.querySelectorAll(".language-selector button").forEach((btn) => {
        btn.classList.remove("active-lang");
        if (btn.textContent.toLowerCase() === lang) {
            btn.classList.add("active-lang");
        }
    });
}

// Aplicar traduções com base na língua
function setLanguage(lang) {
    // Elementos com texto normal
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const text = translations[lang]?.[key];

        if (text !== undefined) {
            if (el.classList.contains("html-i18n")) {
                el.innerHTML = text;
            } else {
                el.textContent = text;
            }
        }
    });

    // Elementos <option> (ex: select de tipo de contacto)
    document.querySelectorAll("option[data-i18n]").forEach((opt) => {
        const key = opt.getAttribute("data-i18n");
        const text = translations[lang]?.[key];

        if (text !== undefined) {
            opt.textContent = text;
        }
    });
}

// Formulário com reCAPTCHA + Modal
const form = document.getElementById("contactForm");
form.addEventListener("submit", function (e) {
    e.preventDefault();
    grecaptcha.ready(function () {
        grecaptcha.execute('6Ldu5WcrAAAAAGD6FpjV029uN38EviyFVu9vlBrs', { action: 'submit' }).then(function (token) {
            document.getElementById('g-recaptcha-response').value = token;

            fetch(form.action, {
                method: "POST",
                body: new FormData(form),
            }).then(() => {
                var modal = new bootstrap.Modal(document.getElementById("successModal"));
                modal.show();
                form.reset();
            }).catch(() => {
                alert("Erro ao enviar. Por favor tente novamente mais tarde.");
            });
        });
    });
});

// Ao carregar a página, definir o idioma salvo
// document.addEventListener("DOMContentLoaded", function () {
//     const savedLang = localStorage.getItem("selectedLang") || "pt";
//     // TODO - Corrigir alteracao de idioma automatica
//     changeLanguage(savedLang);
// });

document.addEventListener('DOMContentLoaded', () => {
  const isLandscape = window.innerWidth > window.innerHeight;
  const isMobile = window.innerWidth < 768;

  const videoSrc = isMobile && !isLandscape
    ? 'assets/video/mobile-video.mp4'
    : 'assets/video/desktop-video.mp4';

  const video = document.getElementById('bg-video');
  const source = document.createElement('source');
  source.setAttribute('src', videoSrc);
  source.setAttribute('type', 'video/mp4');
  video.innerHTML = '';
  video.appendChild(source);
  video.load();
});

