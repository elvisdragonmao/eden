import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const chrome = document.querySelector(".site-chrome");
const menuToggle = document.querySelector(".menu-toggle");
const drawer = document.querySelector(".mobile-drawer");
const storyScroll = document.querySelector(".story-scroll");
const coverScene = document.querySelector(".cover-scene");
const galleryTrack = document.querySelector(".gallery-track");
const lightbox = document.querySelector(".lightbox");
const lightboxStage = document.querySelector(".lightbox-stage");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxCaption = document.querySelector(".lightbox-caption p");
const lightboxAuthor = document.querySelector(".lightbox-caption a");
const lightboxClose = document.querySelector(".lightbox-close");
let galleryMarqueeTween;
let galleryMarqueeActive = false;
const coverStartScale = 1.8;
const coverStartRotateX = 5;
const coverStartRotateY = -8;
const coverAvatarAspect = 1500 / 2066;
const coverFinalAvatarOffset = 28;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function setChromeTheme(theme) {
	if (!chrome) return;
	chrome.dataset.theme = theme;
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

function playInkSweep() {
	if (!coverScene) return;
	coverScene.classList.remove("is-ink-playing");
	coverScene.classList.remove("is-ink-complete");
	void coverScene.offsetWidth;
	coverScene.classList.add("is-ink-playing");
}

function initInkSweep() {
	if (!coverScene) return;

	coverScene.addEventListener("animationend", event => {
		if (!event.target.classList.contains("cover-avatar-color")) return;
		coverScene.classList.add("is-ink-complete");
	});
}

function baseRect(element) {
	if (!element) return null;
	const previousTransform = element.style.transform;
	element.style.transform = "";
	const rect = element.getBoundingClientRect();
	element.style.transform = previousTransform;
	return rect;
}

function coverStartMaskHeight() {
	return `${Math.max(window.innerHeight * 4.6, window.innerWidth * 3)}px`;
}

function coverFinalMaskHeight() {
	return `${window.innerHeight}px`;
}

function coverStartOffsetX() {
	return -clamp(window.innerWidth * 0.045, 28, 72);
}

function coverStartOffsetY() {
	return -clamp(window.innerHeight * 0.04, 20, 44);
}

function coverContentStartOffsetX() {
	return -coverStartOffsetX() / coverStartScale;
}

function coverContentStartOffsetY() {
	return -coverStartOffsetY() / coverStartScale;
}

function resetCoverAvatarLayout() {
	const avatar = document.querySelector(".cover-avatar");
	if (!avatar) return;
	avatar.style.removeProperty("top");
	avatar.style.removeProperty("left");
	avatar.style.removeProperty("width");
	avatar.style.removeProperty("--cover-avatar-top");
	avatar.style.removeProperty("--cover-avatar-left");
	avatar.style.removeProperty("--cover-avatar-width");
}

function readCoverAvatarLayout() {
	const avatar = document.querySelector(".cover-avatar");
	if (!avatar) return {};
	const style = getComputedStyle(avatar);

	return {
		top: style.top,
		left: style.left,
		width: style.width
	};
}

function alignToElement(fromSelector, toSelector, axis) {
	return () => {
		const from = baseRect(document.querySelector(fromSelector));
		const to = baseRect(document.querySelector(toSelector));
		if (!from || !to) return 0;

		if (axis === "x") return to.left + to.width / 2 - (from.left + from.width / 2);
		if (axis === "y") return to.top + to.height / 2 - (from.top + from.height / 2);
		if (axis === "scaleX") return to.width / from.width;
		if (axis === "scaleY") return to.height / from.height;

		return 0;
	};
}

function scaleToElementHeight(fromSelector, toSelector) {
	return () => {
		const from = baseRect(document.querySelector(fromSelector));
		const to = baseRect(document.querySelector(toSelector));
		if (!from || !to) return 1;

		return to.height / from.height;
	};
}

function setThemeByProgress(progress) {
	if (progress < 0.22) {
		setChromeTheme("cover");
		return;
	}

	if (progress < 0.5) {
		setChromeTheme("dark");
		return;
	}

	if (progress < 0.82) {
		setChromeTheme("light");
		return;
	}

	setChromeTheme("dark");
}

function setGalleryMarqueeActive(isActive) {
	if (!galleryMarqueeTween || !galleryTrack) return;
	if (isActive === galleryMarqueeActive) return;

	galleryMarqueeActive = isActive;

	if (isActive) {
		galleryMarqueeTween.resume();
		return;
	}

	galleryMarqueeTween.pause(0);
	gsap.set(galleryTrack, { x: 0 });
}

function initStoryTimeline() {
	if (!storyScroll) return;

	const mm = gsap.matchMedia();

	mm.add(
		{
			mobile: "(max-width: 900px)",
			desktop: "(min-width: 901px)"
		},
		context => {
			const { mobile } = context.conditions;
			let coverWasActive = false;

			resetCoverAvatarLayout();
			gsap.set(".cover-section", { autoAlpha: 1 });
			gsap.set(".cover-scene", {
				autoAlpha: 1,
				x: coverStartOffsetX(),
				y: coverStartOffsetY(),
				scale: coverStartScale,
				rotateX: coverStartRotateX,
				rotateY: coverStartRotateY,
				rotation: 0,
				transformPerspective: 1200,
				"--cover-mask-height": coverStartMaskHeight()
			});
			gsap.set(".cover-content", {
				x: coverContentStartOffsetX(),
				y: coverContentStartOffsetY(),
				scale: 1 / coverStartScale,
				rotateX: -coverStartRotateX,
				rotateY: -coverStartRotateY,
				rotation: 0,
				transformOrigin: "50% 50%"
			});
			gsap.set(".cover-world", { clearProps: "transform" });
			gsap.set(".cover-avatar", readCoverAvatarLayout());
			gsap.set(".about-section, .commission-section, .gallery-section", { autoAlpha: 0 });
			gsap.set(".about-title", mobile ? { autoAlpha: 0, x: 72, y: 0 } : { autoAlpha: 0, x: 0, y: -72 });
			gsap.set(".about-copy, .about-feier, .about-head", { autoAlpha: 0, y: 28 });
			gsap.set(".commission-copy", { autoAlpha: 0, y: 36 });
			gsap.set(".gallery-section h2, .gallery-intro", { autoAlpha: 0, y: 28 });
			gsap.set(".gallery-card", { autoAlpha: 0, y: 44 });
			gsap.set(".gallery-card.is-transition", { autoAlpha: 0, y: 0, rotateY: -180, scale: 1 });
			gsap.set(".commission-flip", {
				autoAlpha: 0,
				x: 0,
				y: 0,
				scaleX: 1,
				scaleY: 1,
				rotateX: 0,
				clipPath: "inset(0px round 32px)",
				transformPerspective: mobile ? 1000 : 1200,
				transformOrigin: "50% 50%"
			});
			gsap.set(".flip-card", {
				rotateY: 0,
				transformPerspective: mobile ? 1000 : 1200,
				transformOrigin: "50% 50%"
			});

			const tl = gsap.timeline({
				defaults: { ease: "none" },
				scrollTrigger: {
					id: "story",
					trigger: storyScroll,
					start: "top top",
					end: "bottom bottom",
					scrub: 1,
					invalidateOnRefresh: true,
					onUpdate: self => {
						setThemeByProgress(self.progress);
						setGalleryMarqueeActive(self.progress > 0.955);

						const isCoverActive = self.progress < 0.035;
						if (isCoverActive && !coverWasActive) playInkSweep();
						coverWasActive = isCoverActive;
					}
				}
			});

			tl.to({}, { duration: 1 }, 0);
			tl.set(".about-section", { autoAlpha: 1 }, 0.14);
			tl.to(".about-section", { "--about-grid-opacity": 1, duration: 0.18 }, 0.14);
			tl.to(
				".cover-scene",
				{
					x: alignToElement(".cover-scene", ".about-portrait", "x"),
					y: alignToElement(".cover-scene", ".about-portrait", "y"),
					scale: scaleToElementHeight(".cover-scene", ".about-portrait"),
					rotateX: 0,
					rotateY: 0,
					rotation: 0,
					duration: 0.24
				},
				0.1
			);
			tl.fromTo(".cover-scene", { "--cover-mask-height": coverStartMaskHeight }, { "--cover-mask-height": coverFinalMaskHeight, duration: 0.24 }, 0.1);
			tl.to(".cover-content", { x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0, rotation: 0, duration: 0.24 }, 0.1);
			tl.to(
				".cover-avatar",
				{
					top: () => `${mobile ? 22 : coverFinalAvatarOffset}px`,
					left: () => `${window.innerWidth / 2}px`,
					width: () => `${window.innerHeight * coverAvatarAspect}px`,
					duration: 0.14
				},
				0.2
			);
			tl.to(".cover-title, .scroll-cue", { autoAlpha: 0, y: mobile ? -18 : -32, duration: 0.08 }, 0.1);
			tl.to(".about-title", { autoAlpha: 1, x: 0, y: 0, duration: 0.12 }, 0.2);
			tl.to(".about-copy", { autoAlpha: 1, y: 0, stagger: 0.025, duration: 0.12 }, 0.24);
			tl.to(".about-feier", { autoAlpha: 1, y: 0, duration: 0.12 }, 0.25);
			tl.to(".about-head", { autoAlpha: 1, y: 0, duration: 0.12 }, 0.24);

			tl.to(".commission-section", { autoAlpha: 1, duration: 0.12 }, 0.42);
			tl.to(".about-section", { autoAlpha: 0, duration: 0.12 }, 0.44);
			tl.to(".cover-scene", { autoAlpha: 0, duration: 0.1 }, 0.42);
			tl.fromTo(
				".commission-flip",
				{
					autoAlpha: 0,
					x: alignToElement(".commission-flip", ".about-head", "x"),
					y: alignToElement(".commission-flip", ".about-head", "y"),
					scaleX: alignToElement(".commission-flip", ".about-head", "scaleX"),
					scaleY: alignToElement(".commission-flip", ".about-head", "scaleY"),
					rotateX: mobile ? -5 : -7
				},
				{
					autoAlpha: 1,
					x: 0,
					y: 0,
					scaleX: 1,
					scaleY: 1,
					rotateX: 0,
					duration: 0.16
				},
				0.43
			);
			tl.to(".commission-copy", { autoAlpha: 1, y: 0, duration: 0.12 }, 0.5);
			tl.to(".commission-flip", { scaleX: 1.12, scaleY: 1.12, rotateX: mobile ? 6 : 8, duration: 0.18 }, 0.62);
			tl.to(".flip-card", { rotateY: 180, duration: 0.18 }, 0.62);
			tl.to(".commission-copy", { autoAlpha: 0, y: -28, duration: 0.1 }, 0.66);

			tl.to(".gallery-section", { autoAlpha: 1, duration: 0.12 }, 0.75);
			tl.to(".gallery-section h2, .gallery-intro", { autoAlpha: 1, y: 0, stagger: 0.02, duration: 0.1 }, 0.78);
			tl.to(".gallery-card:not(.is-transition)", { autoAlpha: 1, y: 0, stagger: 0.018, duration: 0.12 }, 0.82);
			tl.to(
				".commission-flip",
				{
					x: alignToElement(".commission-flip", ".gallery-card.is-transition", "x"),
					y: alignToElement(".commission-flip", ".gallery-card.is-transition", "y"),
					scaleX: alignToElement(".commission-flip", ".gallery-card.is-transition", "scaleX"),
					scaleY: alignToElement(".commission-flip", ".gallery-card.is-transition", "scaleY"),
					rotateX: 0,
					clipPath: "inset(0px round 29px)",
					duration: 0.16
				},
				0.8
			);
			tl.to(".flip-card", { rotateY: 360, duration: 0.16 }, 0.8);
			tl.to(".gallery-card.is-transition", { autoAlpha: 1, rotateY: 0, duration: 0.04 }, 0.935);
			tl.to(".commission-flip", { autoAlpha: 0, duration: 0.04 }, 0.94);
			tl.to(".commission-section", { autoAlpha: 0, duration: 0.08 }, 0.92);

			setThemeByProgress(ScrollTrigger.getById("story")?.progress || 0);
			playInkSweep();
		}
	);
}

function initReducedStory() {
	setChromeTheme("cover");
	gsap.set(".section", { autoAlpha: 0 });
	gsap.set(".cover-section", { autoAlpha: 1 });
	gsap.set(".cover-scene", {
		autoAlpha: 1,
		x: coverStartOffsetX(),
		y: coverStartOffsetY(),
		scale: coverStartScale,
		rotateX: coverStartRotateX,
		rotateY: coverStartRotateY,
		rotation: 0,
		transformPerspective: 1200,
		"--cover-mask-height": coverStartMaskHeight()
	});
	gsap.set(".cover-content", {
		x: coverContentStartOffsetX(),
		y: coverContentStartOffsetY(),
		scale: 1 / coverStartScale,
		rotateX: -coverStartRotateX,
		rotateY: -coverStartRotateY,
		rotation: 0,
		transformOrigin: "50% 50%"
	});
	gsap.set(".cover-world", { clearProps: "transform" });
	resetCoverAvatarLayout();
	gsap.set(".cover-avatar", readCoverAvatarLayout());
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
			repeat: -1,
			paused: true
		});

		galleryMarqueeTween = tween;

		galleryTrack.addEventListener("pointerenter", () => {
			if (galleryMarqueeActive) tween.pause();
		});
		galleryTrack.addEventListener("pointerleave", () => {
			if (galleryMarqueeActive) tween.resume();
		});

		return () => {
			galleryMarqueeTween = null;
			galleryMarqueeActive = false;
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
	initInkSweep();
	initPointerParallax();
	initGalleryMarquee();
	initStoryTimeline();
} else {
	initReducedStory();
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
