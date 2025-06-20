const scrollUpBtn = document.getElementById('scrollUpBtn');
window.onscroll = function () {
    scrollUpBtn.style.display = window.scrollY > 300 ? 'block' : 'none';
};
scrollUpBtn.onclick = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function changeLanguage(lang) {
    alert(`Mudar idioma para: ${lang} (funcionalidade em desenvolvimento)`);
}

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
