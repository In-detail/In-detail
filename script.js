// 1. STICKY HLAVIČKA
const header = document.getElementById('main-header');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// 1b. PLYNULÝ POSUN PO KLIKNUTÍ NA ODKAZ S KOTVOU (menu, logo v hlavičce i patičce, tlačítka)
// Vlastní animace funguje stejně ve všech prohlížečích, nezávisle na podpoře CSS scroll-behavior
// a na nastavení animací v systému. Pokud má uživatel zapnuté omezení pohybu, stránka se jen přeskočí.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let scrollAnimation = null;

function cancelScrollAnimation() {
    if (scrollAnimation) {
        cancelAnimationFrame(scrollAnimation);
        scrollAnimation = null;
    }
}

function smoothScrollTo(targetY) {
    cancelScrollAnimation();
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const endY = Math.max(0, Math.min(targetY, maxY));
    const startY = window.scrollY;
    const distance = endY - startY;

    if (reduceMotion.matches || Math.abs(distance) < 2) {
        window.scrollTo({ top: endY, behavior: 'instant' });
        return;
    }

    const duration = Math.min(1200, Math.max(600, Math.abs(distance) * 0.4)); // 0,6–1,2 s podle vzdálenosti
    const startTime = performance.now();
    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function step(now) {
        const t = Math.min((now - startTime) / duration, 1);
        window.scrollTo({ top: startY + distance * easeInOutCubic(t), behavior: 'instant' });
        scrollAnimation = t < 1 ? requestAnimationFrame(step) : null;
    }
    scrollAnimation = requestAnimationFrame(step);
}

// Když uživatel během posunu sám zatočí kolečkem, dotkne se obrazovky nebo stiskne klávesu, animace se přeruší
['wheel', 'touchstart', 'keydown'].forEach((type) => {
    window.addEventListener(type, cancelScrollAnimation, { passive: true });
});

document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    const hash = link.getAttribute('href');
    let targetY = 0; // "#" a "#domu" vedou na úplný začátek stránky
    if (hash !== '#' && hash !== '#domu') {
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (!target) return;
        targetY = target.getBoundingClientRect().top + window.scrollY;
    }

    e.preventDefault();
    smoothScrollTo(targetY);
    history.pushState(null, '', hash === '#' ? location.pathname + location.search : hash);
});

// 2. AKTIVNÍ SEKCIONÁLNÍ LINKY V MENU PŘI SCROLLOVÁNÍ
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-link');

window.addEventListener('scroll', () => {
    let currentSectionId = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 120; // offset pro sticky header
        if (window.scrollY >= sectionTop) {
            currentSectionId = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSectionId}`) {
            link.classList.add('active');
        }
    });
});

// 3. INTERAKTIVNÍ SLIDER PŘED / PO (Srovnávací galerie)
const container = document.getElementById('comparison-slider');
const handle = document.getElementById('slider-handle');

// Poloha táhla (0–100 %) se ukládá do CSS proměnné --pos, kterou používá styl
function setSlider(percent) {
    const position = Math.min(100, Math.max(0, percent));
    container.style.setProperty('--pos', `${position}%`);
    handle.setAttribute('aria-valuenow', Math.round(position));
}

function moveSlider(x) {
    const rect = container.getBoundingClientRect();
    setSlider(((x - rect.left) / rect.width) * 100);
}

// Myš, dotyk i pero jednotně přes Pointer Events
let isDragging = false;
container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    container.setPointerCapture(e.pointerId);
    moveSlider(e.clientX);
});
container.addEventListener('pointermove', (e) => {
    if (isDragging) moveSlider(e.clientX);
});
const stopDragging = () => { isDragging = false; };
container.addEventListener('pointerup', stopDragging);
container.addEventListener('pointercancel', stopDragging);

// Ovládání klávesnicí (šipky, Home, End)
handle.addEventListener('keydown', (e) => {
    const current = Number(handle.getAttribute('aria-valuenow'));
    const keys = { ArrowLeft: current - 5, ArrowRight: current + 5, Home: 0, End: 100 };
    if (e.key in keys) {
        e.preventDefault();
        setSlider(keys[e.key]);
    }
});

// 3b. PRUH FOTEK POD GALERIÍ (šipky vlevo a vpravo)
const photoStrip = document.getElementById('photo-strip');
const stripPrev = document.querySelector('.strip-prev');
const stripNext = document.querySelector('.strip-next');

function updateStripButtons() {
    const maxScroll = photoStrip.scrollWidth - photoStrip.clientWidth;
    stripPrev.disabled = photoStrip.scrollLeft <= 1;
    stripNext.disabled = photoStrip.scrollLeft >= maxScroll - 1;
}

stripPrev.addEventListener('click', () => photoStrip.scrollBy({ left: -photoStrip.clientWidth * 0.8 }));
stripNext.addEventListener('click', () => photoStrip.scrollBy({ left: photoStrip.clientWidth * 0.8 }));
photoStrip.addEventListener('scroll', updateStripButtons, { passive: true });
window.addEventListener('resize', updateStripButtons);
updateStripButtons();

// 3c. LIGHTBOX PRO FOTKY V PRUHU
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox.querySelector('.lightbox-img');
const lightboxText = lightbox.querySelector('.lightbox-text');
const lightboxCount = lightbox.querySelector('.lightbox-count');
const stripLinks = [...photoStrip.querySelectorAll('.strip-item')];
let lightboxIndex = 0;

function showPhoto(i) {
    const total = stripLinks.length;
    lightboxIndex = (i + total) % total; // z poslední fotky se jde na první a naopak
    const link = stripLinks[lightboxIndex];
    const thumb = link.querySelector('img');

    // nejdřív hned malý náhled, po načtení se vymění za velkou verzi
    lightboxImg.src = thumb.currentSrc || thumb.src;
    lightboxImg.alt = thumb.alt;
    const full = new Image();
    full.onload = () => { if (stripLinks[lightboxIndex] === link) lightboxImg.src = full.src; };
    full.src = link.href;

    lightboxText.textContent = thumb.alt;
    lightboxCount.textContent = `${lightboxIndex + 1} / ${total}`;

    // předem načíst sousední fotky, ať se přepínání nezasekává
    [lightboxIndex - 1, lightboxIndex + 1].forEach((n) => {
        new Image().src = stripLinks[(n + total) % total].href;
    });
}

function openLightbox(i) {
    showPhoto(i);
    if (!lightbox.open) {
        lightbox.showModal();
        document.documentElement.classList.add('lightbox-open'); // zamkne posun stránky na pozadí
    }
}

stripLinks.forEach((link, i) => {
    link.addEventListener('click', (e) => {
        e.preventDefault(); // bez JavaScriptu by odkaz otevřel velkou fotku samostatně
        openLightbox(i);
    });
});

lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.querySelector('.lightbox-prev').addEventListener('click', () => showPhoto(lightboxIndex - 1));
lightbox.querySelector('.lightbox-next').addEventListener('click', () => showPhoto(lightboxIndex + 1));

// klik na tmavé pozadí mimo fotku zavře lightbox
lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.close();
});

// šipky na klávesnici (Esc zavírá dialog samo)
lightbox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') showPhoto(lightboxIndex - 1);
    if (e.key === 'ArrowRight') showPhoto(lightboxIndex + 1);
});

// přejetí prstem doleva/doprava
let swipeStartX = null;
lightbox.addEventListener('pointerdown', (e) => {
    swipeStartX = e.pointerType === 'touch' ? e.clientX : null;
});
lightbox.addEventListener('pointerup', (e) => {
    if (swipeStartX === null) return;
    const distance = e.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(distance) > 50) showPhoto(lightboxIndex + (distance < 0 ? 1 : -1));
});

// po zavření odemknout stránku a ukázat v pruhu fotku, u které jsme skončili
lightbox.addEventListener('close', () => {
    document.documentElement.classList.remove('lightbox-open');
    stripLinks[lightboxIndex].scrollIntoView({ block: 'nearest', inline: 'center' });
});

// 4. ELEGANTNÍ ODESLÁNÍ FORMULÁŘE (Mockování bez reloadu stránky)
const form = document.getElementById('poptavka-form');
const successMsg = document.getElementById('success-message');

form.addEventListener('submit', (e) => {
    e.preventDefault(); // Zabrání reloadu stránky

    // Zde by v reálu probíhalo odeslání dat přes AJAX/Fetch na server
    successMsg.classList.add('show');
    form.reset(); // Vyčistí políčka
});
