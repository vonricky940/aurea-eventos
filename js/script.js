
// DOMContentLoaded — Inicializações e segurança de carregamento
document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init] DOM totalmente carregado.");

    // Botão "voltar ao topo"
    const scrollUpBtn = document.getElementById('scrollUpBtn');
    if (scrollUpBtn) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 300) {
                scrollUpBtn.style.display = "flex";
            } else {
                scrollUpBtn.style.display = "none";
            }
        });
        scrollUpBtn.onclick = function () {
            console.log("[Scroll] Botão clicado. Subir para o topo.");
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        console.log("[Init] Scroll to top button setup concluído.");
    } else {
        console.warn("[Init] Botão scrollUpBtn não encontrado no DOM.");
    }

    // Formulário personalizado ligado ao Google Forms
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const inquiryRadios = contactForm.querySelectorAll('input[name="entry.609118544"]');
        const quoteSection = contactForm.querySelector('[data-quote-section]');
        const quoteFields = quoteSection ? Array.from(quoteSection.querySelectorAll('input, textarea, select')) : [];
        const quoteRequired = contactForm.querySelectorAll('[data-quote-required="true"]');
        const contactTypeSelect = contactForm.querySelector('#contact-event-type');
        const otherFieldWrapper = contactForm.querySelector('[data-other-field]');
        const otherFieldInput = otherFieldWrapper ? otherFieldWrapper.querySelector('input, textarea') : null;
        const venueFieldWrapper = contactForm.querySelector('[data-venue-field]');
        const venueFieldInput = venueFieldWrapper ? venueFieldWrapper.querySelector('input, textarea') : null;
        const venueRadios = contactForm.querySelectorAll('input[name="entry.1400779123"]');
        const statusElement = contactForm.querySelector('.gform-status');
        const submitButton = document.getElementById('contact-submit');
        const pageHistoryInput = contactForm.querySelector('input[name="pageHistory"]');
        const honeypotField = contactForm.querySelector('input[name="aurea_contact_hp"]');
        const formStartField = contactForm.querySelector('input[name="form_start_ms"]');
        const submissionEndpoint = (contactForm.dataset.endpoint || '').trim() ||
            'https://docs.google.com/forms/d/e/1FAIpQLSdfRjq2UcHtCGnHlZjzLY3TAxaPL54HBLlcVGivBDES9T00mg/formResponse';
        const MIN_SUBMIT_DELAY_MS = Number(contactForm.dataset.minDelay || 3000);
        const successModalElement = document.getElementById('successModal');
        const getActiveLang = () => localStorage.getItem('selectedLang') || 'pt';
        const translate = (key, fallback = '') => {
            const lang = getActiveLang();
            return translations?.[lang]?.[key] ?? translations?.pt?.[key] ?? fallback ?? key;
        };
        let endTimeManuallyEdited = false;
        let formInitializedAt = Date.now();

        const resetFormTimer = () => {
            formInitializedAt = Date.now();
            if (formStartField) {
                formStartField.value = String(formInitializedAt);
            }
            if (honeypotField) {
                honeypotField.value = '';
            }
            endTimeManuallyEdited = false;
        };

        resetFormTimer();

        if (successModalElement) {
            successModalElement.addEventListener('shown.bs.modal', () => {
                document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                    backdrop.classList.add('success-modal-backdrop');
                });
            });

            successModalElement.addEventListener('hidden.bs.modal', () => {
                document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
                    backdrop.classList.remove('success-modal-backdrop');
                });
            });
        }

        const isQuoteSelected = () => {
            const selected = contactForm.querySelector('input[name="entry.609118544"]:checked');
            return !!selected && selected.value === 'Pedido de Orçamento / Quote Request';
        };

        const updatePageHistory = (quoteActive) => {
            if (pageHistoryInput) {
                pageHistoryInput.value = quoteActive ? '0,1' : '0';
            }
        };

        const updateOtherField = () => {
            if (!otherFieldWrapper || !otherFieldInput) return;
            const selectedValue = contactTypeSelect?.value;
            const shouldShow = isQuoteSelected() && selectedValue === 'Outro / Other';
            otherFieldWrapper.hidden = !shouldShow;
            otherFieldInput.disabled = !shouldShow;
            otherFieldInput.required = shouldShow;
            if (!shouldShow) {
                otherFieldInput.value = '';
            }
        };

        const updateVenueField = () => {
            if (!venueFieldWrapper || !venueFieldInput) return;
            const hasVenue = Array.from(venueRadios).some(radio => radio.checked && radio.value === 'Sim / Yes');
            const shouldShow = isQuoteSelected() && hasVenue;
            venueFieldWrapper.hidden = !shouldShow;
            venueFieldInput.disabled = !shouldShow;
            if (!shouldShow) {
                venueFieldInput.value = '';
            }
        };

        const toggleQuoteFields = (active) => {
            if (!quoteSection) return;
            quoteSection.hidden = !active;
            quoteFields.forEach((field) => {
                field.disabled = !active;
                if (!active) {
                    if (field.type === 'checkbox' || field.type === 'radio') {
                        field.checked = false;
                    } else if (field.tagName === 'SELECT') {
                        field.selectedIndex = 0;
                    } else if (field.type !== 'hidden') {
                        field.value = '';
                    }
                }
            });
            quoteRequired.forEach((field) => {
                field.required = active;
            });
            if (contactTypeSelect) {
                contactTypeSelect.disabled = !active;
                contactTypeSelect.required = active;
                if (!active) {
                    contactTypeSelect.value = '';
                    contactTypeSelect.selectedIndex = 0;
                    venueRadios.forEach(radio => { radio.checked = false; });
                } else if (!contactTypeSelect.value) {
                    contactTypeSelect.selectedIndex = 0;
                }
            }
            updatePageHistory(active);
            updateOtherField();
            updateVenueField();
        };

        const startDateInput = contactForm.querySelector('#contact-start-date');
        const startTimeInput = contactForm.querySelector('#contact-start-time');
        const endTimeInput = contactForm.querySelector('#contact-end-time');

        const applyDefaultTimes = () => {
            if (!startTimeInput) return;
            if (!startTimeInput.value) {
                startTimeInput.value = '10:00';
            }
            if (endTimeInput && (!endTimeManuallyEdited || !endTimeInput.value)) {
                const [hours, minutes] = (startTimeInput.value || '10:00').split(':').map(Number);
                if (!Number.isNaN(hours)) {
                    const endDate = new Date();
                    endDate.setHours(hours);
                    endDate.setMinutes(minutes || 0);
                    endDate.setHours(endDate.getHours() + 4);
                    const endHours = String(endDate.getHours()).padStart(2, '0');
                    const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
                    endTimeInput.value = `${endHours}:${endMinutes}`;
                }
            }
        };

        const initialQuoteActive = isQuoteSelected();
        toggleQuoteFields(initialQuoteActive);
        updateOtherField();
        updateVenueField();
        updatePageHistory(initialQuoteActive);

        if (otherFieldWrapper && otherFieldInput && !initialQuoteActive) {
            otherFieldWrapper.hidden = true;
            otherFieldInput.disabled = true;
        }
        if (venueFieldWrapper && venueFieldInput && !initialQuoteActive) {
            venueFieldWrapper.hidden = true;
            venueFieldInput.disabled = true;
        }

        inquiryRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                toggleQuoteFields(isQuoteSelected());
            });
        });

        contactTypeSelect?.addEventListener('change', () => {
            if (contactTypeSelect.value) {
                contactTypeSelect.setCustomValidity('');
            }
            updateOtherField();
        });

        venueRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                updateVenueField();
            });
        });

        startDateInput?.addEventListener('focus', () => {
            if (startDateInput.showPicker) {
                startDateInput.showPicker();
            }
        });

        startDateInput?.addEventListener('change', () => {
            endTimeManuallyEdited = false;
            if (startTimeInput?.showPicker) {
                startTimeInput.showPicker();
            }
            applyDefaultTimes();
        });

        startTimeInput?.addEventListener('change', () => {
            applyDefaultTimes();
        });

        const markEndTimeEdited = () => {
            endTimeManuallyEdited = Boolean(endTimeInput?.value);
        };

        endTimeInput?.addEventListener('input', markEndTimeEdited);
        endTimeInput?.addEventListener('change', markEndTimeEdited);

        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            statusElement.textContent = '';
            statusElement.classList.remove('error', 'success');

            if (honeypotField && honeypotField.value.trim() !== '') {
                statusElement.textContent = translate('form.status.spam', 'Não foi possível enviar. Por favor, tente novamente.');
                statusElement.classList.add('error');
                return;
            }

            const elapsedTime = Date.now() - formInitializedAt;
            if (elapsedTime < MIN_SUBMIT_DELAY_MS) {
                statusElement.textContent = translate('form.status.tooFast', 'Demorou muito pouco tempo. Confirme os dados e tente novamente.');
                statusElement.classList.add('error');
                return;
            }

            if (!contactForm.checkValidity()) {
                statusElement.textContent = translate('form.status.validation', 'Por favor, preencha os campos obrigatórios.');
                statusElement.classList.add('error');
                contactForm.classList.add('was-validated');
                contactForm.reportValidity();
                return;
            }

            contactForm.classList.remove('was-validated');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = translate('form.status.loading', 'A enviar...');

            if (formStartField) {
                formStartField.value = String(formInitializedAt);
            }

            const formData = new FormData(contactForm);

            try {
                const isGoogleEndpoint = submissionEndpoint.includes('docs.google.com/forms');
                const fetchOptions = {
                    method: 'POST',
                    body: formData
                };

                if (isGoogleEndpoint) {
                    fetchOptions.mode = 'no-cors';
                } else {
                    fetchOptions.headers = {
                        'X-Form-Started': String(formInitializedAt),
                        'Accept': 'application/json'
                    };
                }

                const response = await fetch(submissionEndpoint, fetchOptions);

                if (!isGoogleEndpoint) {
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok || payload.success !== true) {
                        throw new Error(payload.error || 'FORM_SUBMIT_FAILED');
                    }
                } else if (!response.ok && response.type !== 'opaque') {
                    throw new Error('FORM_SUBMIT_FAILED');
                }

                statusElement.textContent = translate('form.status.success', 'Obrigado! Recebemos a sua mensagem.');
                statusElement.classList.add('success');
                contactForm.reset();
                resetFormTimer();
                const quoteActiveAfterReset = isQuoteSelected();
                toggleQuoteFields(quoteActiveAfterReset);
                updateOtherField();
                updateVenueField();
                updatePageHistory(quoteActiveAfterReset);

                if (successModalElement) {
                    const modal = bootstrap.Modal.getOrCreateInstance(successModalElement);
                    modal.show();
                }
            } catch (error) {
                console.error('[Contact Form] Falha no envio', error);
                const errorCode = (error && error.message) ? String(error.message) : '';
                if (errorCode === 'TOO_FAST') {
                    statusElement.textContent = translate('form.status.tooFast', 'Demorou muito pouco tempo. Confirme os dados e tente novamente.');
                } else if (errorCode === 'HONEYPOT_TRIGGERED' || errorCode === 'RATE_LIMITED') {
                    statusElement.textContent = translate('form.status.spam', 'Não foi possível enviar. Por favor, tente novamente ou contacte-nos diretamente.');
                } else {
                    statusElement.textContent = translate('form.status.error', 'Ocorreu um erro ao enviar. Tente novamente mais tarde.');
                }
                statusElement.classList.add('error');
                formInitializedAt = Date.now();
                if (formStartField) {
                    formStartField.value = String(formInitializedAt);
                }
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });

        document.addEventListener('languageChanged', () => {
            updateOtherField();
            if (contactTypeSelect && !contactTypeSelect.value) {
                contactTypeSelect.selectedIndex = 0;
            }
            resetFormTimer();
        });
    } else {
        console.warn('[Contact Form] Formulário personalizado não encontrado no DOM.');
    }


    // Mapa com Leaflet (apenas se o elemento existir)
    const mapElement = document.getElementById('map');
    if (mapElement) {
        const map = L.map(mapElement).setView([41.5, -8.4], 8.5); // Região Norte de Portugal

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        }).addTo(map);

        let marker;

        map.on('click', function (e) {
            const lat = e.latlng.lat.toFixed(5);
            const lng = e.latlng.lng.toFixed(5);

            if (marker) {
                marker.setLatLng(e.latlng);
            } else {
                marker = L.marker(e.latlng).addTo(map);
            }

            const link = `https://www.google.com/maps?q=${lat},${lng}`;
            const linkField = document.getElementById('mapaLink');
            if (linkField) {
                linkField.value = link;
            }

            const txt = document.getElementById('localidadeTexto');
            if (txt && txt.value.trim() === '') {
                txt.value = `Localização em ${lat}, ${lng}`;
            }
        });

        L.Control.geocoder({
            defaultMarkGeocode: false
        })
            .on('markgeocode', function (e) {
                const { center, name } = e.geocode;

                map.setView(center, 14);

                if (marker) {
                    marker.setLatLng(center);
                } else {
                    marker = L.marker(center).addTo(map);
                }

                const localidade = document.getElementById('localidadeTexto');
                if (localidade) {
                    localidade.value = name;
                }

                const linkField = document.getElementById('mapaLink');
                if (linkField) {
                    linkField.value = `https://www.google.com/maps?q=${center.lat},${center.lng}`;
                }
            })
            .addTo(map);
    } else {
        console.log("[Mapa] Elemento #map não encontrado. A funcionalidade de mapa está desativada nesta página.");
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
    };

    // Banner de cookies
    const cookieBanner = document.getElementById("cookie-banner");
    const acceptBtn = document.getElementById("accept-cookies");

    if (localStorage.getItem("cookiesAccepted") !== "true") {
        cookieBanner.style.display = "flex";
    }

    acceptBtn.addEventListener("click", () => {
        localStorage.setItem("cookiesAccepted", "true");
        cookieBanner.style.display = "none";
    });

    // Quando se clica em qualquer botão .ver-mais
    document.body.addEventListener('click', function (e) {
        if (e.target.classList.contains('ver-mais-btn')) {
            const comentarioCompleto = e.target.getAttribute('data-completo');
            const modalBody = document.getElementById('comentarioCompleto');
            modalBody.textContent = comentarioCompleto;
            const modal = new bootstrap.Modal(document.getElementById('comentarioModal'));
            modal.show();
        }
    });
});

// Função para mudar idioma
function changeLanguage(lang) {
    console.log(`[Language] A mudar para: ${lang}`);
    localStorage.setItem("selectedLang", lang);
    setLanguage(lang);
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));

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
        // Ignorar elementos que contêm outros elementos com data-i18n
        if (el.querySelector("[data-i18n]")) return;

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

    // Traduzir <option> separadamente
    document.querySelectorAll("option[data-i18n]").forEach((opt) => {
        const key = opt.getAttribute("data-i18n");
        const text = translations[lang]?.[key];
        if (text !== undefined) {
            opt.textContent = text;
        }
    });

    // Atualizar placeholders
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        const text = translations[lang]?.[key];
        if (text !== undefined) {
            el.setAttribute("placeholder", text);
        }
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

        for (let i = 1; i <= 18; i++) {
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
            const isLong = t.comentario.length > 200;
            const preview = isLong ? t.comentario.substring(0, 200).trim() + "..." : t.comentario;
            const verMais = isLong
                ? `<button class="ver-mais-btn" data-completo="${t.comentario.replace(/"/g, '&quot;')}">Ver mais</button>`
                : "";

            slide.innerHTML = `
                <div class="testemunho-card">
                    <div class="testemunho-estrelas">${estrelas}</div>
                    <p class="testemunho-comentario">"${preview}"</p>
                    ${verMais}
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
