import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const chrome = document.querySelector(".site-chrome");
const menuToggle = document.querySelector(".menu-toggle");
const drawer = document.querySelector(".mobile-drawer");
const galleryTrack = document.querySelector(".gallery-track");
const lightbox = document.querySelector(".lightbox");
const lightboxStage = document.querySelector(".lightbox-stage");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxCaption = document.querySelector(".lightbox-caption p");
const lightboxAuthor = document.querySelector(".lightbox-caption a");
const lightboxClose = document.querySelector(".lightbox-close");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function setChromeTheme(theme) {
	if (!chrome) return;
	chrome.dataset.theme = theme;
}

function initChromeThemes() {
	const sections = gsap.utils.toArray("[data-chrome]");

	sections.forEach(section => {
		ScrollTrigger.create({
			trigger: section,
			start: "top 55%",
			end: "bottom 45%",
			onEnter: () => setChromeTheme(section.dataset.chrome),
			onEnterBack: () => setChromeTheme(section.dataset.chrome)
		});
	});
}

function initMenu() {
	if (!menuToggle || !drawer) return;

	const setOpen = isOpen => {
		document.body.classList.toggle("is-menu-open", isOpen);
		menuToggle.setAttribute("aria-expanded", String(isOpen));
	};

	menuToggle.addEventListener("click", () => {
		setOpen(menuToggle.getAttribute("aria-expanded") !== "true");
	});

	drawer.addEventListener("click", event => {
		if (event.target.closest("a")) setOpen(false);
	});

	window.addEventListener("keydown", event => {
		if (event.key === "Escape") setOpen(false);
	});
}

function initPointerParallax() {
	const root = document.documentElement;
	let pointerTween;

	window.addEventListener(
		"pointermove",
		event => {
			if (event.pointerType === "touch") return;

			const mx = (event.clientX / window.innerWidth - 0.5) * 2;
			const my = (event.clientY / window.innerHeight - 0.5) * 2;

			pointerTween?.kill();
			pointerTween = gsap.to(root, {
				"--mx": mx.toFixed(4),
				"--my": my.toFixed(4),
				duration: 0.5,
				ease: "power3.out"
			});
		},
		{ passive: true }
	);

	window.addEventListener("pointerleave", () => {
		gsap.to(root, {
			"--mx": 0,
			"--my": 0,
			duration: 0.8,
			ease: "power3.out"
		});
	});
}

function initReveals() {
	const mm = gsap.matchMedia();

	mm.add(
		{
			mobile: "(max-width: 900px)",
			desktop: "(min-width: 901px)"
		},
		context => {
			const { mobile } = context.conditions;

			gsap.utils.toArray("[data-reveal]").forEach(element => {
				const revealType = element.dataset.reveal;
				let fromVars = { autoAlpha: 0, y: 28 };

				if (revealType === "about-title") {
					fromVars = mobile ? { autoAlpha: 0, x: 72 } : { autoAlpha: 0, y: -72 };
				}

				if (revealType === "soft") {
					fromVars = { autoAlpha: 0, y: 24, scale: 0.985 };
				}

				const isGalleryIntro = element.classList.contains("gallery-intro");

				gsap.fromTo(element, fromVars, {
					autoAlpha: 1,
					x: 0,
					y: 0,
					scale: 1,
					ease: "none",
					scrollTrigger: {
						trigger: element,
						start: isGalleryIntro ? "top 110%" : "top 88%",
						end: isGalleryIntro ? "top 90%" : "top 58%",
						scrub: 0.7
					}
				});
			});

			gsap.fromTo(
				".about-portrait",
				{
					scale: mobile ? 1.08 : 1.16,
					maskSize: mobile ? "128% 128%" : "142% 142%",
					webkitMaskSize: mobile ? "128% 128%" : "142% 142%"
				},
				{
					scale: 1,
					maskSize: "100% 100%",
					webkitMaskSize: "100% 100%",
					ease: "none",
					scrollTrigger: {
						trigger: ".about-section",
						start: "top 82%",
						end: "top 18%",
						scrub: 1
					}
				}
			);

			gsap.fromTo(
				".about-head",
				{
					scale: mobile ? 1.06 : 1.12,
					maskSize: "130% 130%",
					webkitMaskSize: "130% 130%"
				},
				{
					scale: 1,
					maskSize: "100% 100%",
					webkitMaskSize: "100% 100%",
					ease: "none",
					scrollTrigger: {
						trigger: ".about-section",
						start: "top 72%",
						end: "top 16%",
						scrub: 1
					}
				}
			);
		}
	);
}

function initCommissionFlip() {
	const mm = gsap.matchMedia();

	mm.add("(min-width: 901px)", () => {
		gsap.set(".commission-flip", {
			y: 0,
			scale: 1,
			rotateX: 0,
			transformPerspective: 1200,
			transformOrigin: "50% 52%"
		});
		gsap.set(".flip-card", {
			rotateY: 0,
			transformPerspective: 1200,
			transformOrigin: "50% 50%"
		});

		gsap
			.timeline({
				scrollTrigger: {
					trigger: ".commission-section",
					start: "top bottom",
					end: "top top",
					scrub: 1
				}
			})
			.fromTo(".commission-flip", { y: "-34vh", scale: 0.42 }, { y: 0, scale: 1, ease: "none" });

		gsap
			.timeline({
				scrollTrigger: {
					trigger: ".commission-section",
					start: "top top",
					end: "bottom top",
					scrub: 1
				}
			})
			.to(".commission-flip", {
				scale: 1.12,
				rotateX: 8,
				ease: "none"
			})
			.to(
				".flip-card",
				{
					rotateY: 180,
					ease: "none"
				},
				0
			)
			.to(
				".commission-copy",
				{
					autoAlpha: 0,
					y: -32,
					ease: "none"
				},
				0.22
			);

		gsap.fromTo(
			".gallery-card.is-transition",
			{ autoAlpha: 0, y: -260, scale: 2.15, rotateY: -180 },
			{
				autoAlpha: 1,
				y: 0,
				scale: 1,
				rotateY: 0,
				ease: "none",
				scrollTrigger: {
					trigger: ".gallery-section",
					start: "top bottom",
					end: "top 48%",
					scrub: 1
				}
			}
		);
	});

	mm.add("(max-width: 900px)", () => {
		gsap.set(".commission-flip", {
			y: 0,
			scale: 1,
			rotateX: 0,
			transformPerspective: 1000,
			transformOrigin: "50% 45%"
		});
		gsap.set(".flip-card", {
			rotateY: 0,
			transformPerspective: 1000,
			transformOrigin: "50% 50%"
		});

		gsap
			.timeline({
				scrollTrigger: {
					trigger: ".commission-section",
					start: "top bottom",
					end: "top top",
					scrub: 1
				}
			})
			.fromTo(".commission-flip", { y: -260, scale: 0.44 }, { y: 0, scale: 1, ease: "none" });

		gsap
			.timeline({
				scrollTrigger: {
					trigger: ".commission-section",
					start: "top top",
					end: "bottom top",
					scrub: 1
				}
			})
			.to(".commission-flip", {
				scale: 1.08,
				rotateX: 6,
				ease: "none"
			})
			.to(
				".flip-card",
				{
					rotateY: 180,
					ease: "none"
				},
				0
			)
			.to(
				".commission-copy",
				{
					autoAlpha: 0,
					y: -24,
					ease: "none"
				},
				0.2
			);
	});
}

function initGalleryMarquee() {
	if (!galleryTrack) return;

	const originals = Array.from(galleryTrack.children);
	originals.forEach(card => {
		const clone = card.cloneNode(true);
		clone.dataset.clone = "true";
		clone.setAttribute("aria-hidden", "true");
		clone.tabIndex = -1;
		galleryTrack.append(clone);
	});

	const mm = gsap.matchMedia();

	mm.add("(min-width: 901px)", () => {
		const distance = galleryTrack.scrollWidth / 2;

		gsap.set(galleryTrack, { x: 0 });
		const tween = gsap.to(galleryTrack, {
			x: -distance,
			duration: 34,
			ease: "none",
			repeat: -1
		});

		galleryTrack.addEventListener("pointerenter", () => tween.pause());
		galleryTrack.addEventListener("pointerleave", () => tween.resume());

		return () => {
			tween.kill();
			gsap.set(galleryTrack, { clearProps: "transform" });
		};
	});
}

function initLightbox() {
	if (!lightbox || !lightboxStage || !lightboxImage) return;

	let zoom = 1;
	let offsetX = 0;
	let offsetY = 0;
	let dragStart = null;
	let movedDuringDrag = false;

	const applyTransform = () => {
		lightboxImage.style.setProperty("--zoom", zoom.toFixed(3));
		lightboxImage.style.setProperty("--lx", `${offsetX.toFixed(1)}px`);
		lightboxImage.style.setProperty("--ly", `${offsetY.toFixed(1)}px`);
		lightboxStage.classList.toggle("is-zoomed", zoom > 1);
	};

	const setZoom = nextZoom => {
		zoom = clamp(nextZoom, 1, 4);
		if (zoom === 1) {
			offsetX = 0;
			offsetY = 0;
		}
		applyTransform();
	};

	const open = card => {
		const image = card.dataset.full;
		const caption = card.dataset.caption || "";
		const author = card.dataset.author || "";
		const authorUrl = card.dataset.authorUrl || "#";

		zoom = 1;
		offsetX = 0;
		offsetY = 0;
		lightboxImage.src = image;
		lightboxImage.alt = caption;
		lightboxCaption.textContent = caption;
		lightboxAuthor.textContent = author ? `作者：${author}` : "";
		lightboxAuthor.href = authorUrl;
		applyTransform();

		lightbox.setAttribute("aria-hidden", "false");
		document.body.classList.add("is-lightbox-open");
		lightboxClose?.focus();
	};

	const close = () => {
		lightbox.setAttribute("aria-hidden", "true");
		document.body.classList.remove("is-lightbox-open");
	};

	document.addEventListener("click", event => {
		const card = event.target.closest(".gallery-card");
		if (!card) return;
		open(card);
	});

	lightboxClose?.addEventListener("click", close);

	document.addEventListener("keydown", event => {
		if (event.key === "Escape") close();
	});

	lightbox.querySelectorAll("[data-zoom]").forEach(button => {
		button.addEventListener("click", () => {
			const action = button.dataset.zoom;
			if (action === "in") setZoom(zoom + 0.5);
			if (action === "out") setZoom(zoom - 0.5);
			if (action === "reset") setZoom(1);
		});
	});

	lightboxStage.addEventListener("click", () => {
		if (movedDuringDrag) {
			movedDuringDrag = false;
			return;
		}
		setZoom(zoom > 1 ? 1 : 2);
	});

	lightboxStage.addEventListener("pointerdown", event => {
		if (zoom <= 1) return;

		event.preventDefault();
		dragStart = {
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			offsetX,
			offsetY
		};
		movedDuringDrag = false;
		lightboxStage.classList.add("is-dragging");
		lightboxStage.setPointerCapture(event.pointerId);
	});

	lightboxStage.addEventListener("pointermove", event => {
		if (!dragStart || dragStart.pointerId !== event.pointerId) return;

		const dx = event.clientX - dragStart.x;
		const dy = event.clientY - dragStart.y;
		if (Math.abs(dx) + Math.abs(dy) > 4) movedDuringDrag = true;

		offsetX = dragStart.offsetX + dx;
		offsetY = dragStart.offsetY + dy;
		applyTransform();
	});

	const endDrag = event => {
		if (!dragStart || dragStart.pointerId !== event.pointerId) return;
		dragStart = null;
		lightboxStage.classList.remove("is-dragging");
	};

	lightboxStage.addEventListener("pointerup", endDrag);
	lightboxStage.addEventListener("pointercancel", endDrag);
	lightboxImage.draggable = false;
}

if (!prefersReducedMotion) {
	initChromeThemes();
	initPointerParallax();
	initReveals();
	initCommissionFlip();
	initGalleryMarquee();
} else {
	setChromeTheme("light");
}

initMenu();
initLightbox();

window.addEventListener("load", () => {
	ScrollTrigger.refresh();

	if (window.location.hash) {
		const target = document.querySelector(window.location.hash);
		if (target) {
			window.scrollTo({ top: target.offsetTop, behavior: "instant" });
			ScrollTrigger.update();
		}
	}
});
