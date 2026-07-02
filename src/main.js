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
let syncCoverParallaxProgress = () => {};
const coverMaskAspect = 533 / 806;
const portalMaskAspect = 533 / 806;
const portalTurnClip = "polygon(48.6% 4%, 52.4% 0%, 53.2% 100%, 49.1% 96%)";
const portalMidTurnClip = "polygon(17% -8%, 82% -12%, 87% 112%, 21% 106%)";
const portalFlatClip = "polygon(-12% -12%, 112% -12%, 112% 112%, -12% 112%)";
const storyScrub = 0.24;
const readableTextSelector = ".cover-title, .scroll-cue, .about-title, .about-copy, .commission-copy, .gallery-section h2, .gallery-intro";

if ("scrollRestoration" in window.history) {
	window.history.scrollRestoration = "manual";
}

if (!window.location.hash) {
	window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function clearReadableTextTransforms(selector = readableTextSelector) {
	gsap.set(selector, { clearProps: "transform,willChange" });
}

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
	let pointerX = 0;
	let pointerY = 0;
	let storyProgress = 0;

	const coverFactors = () => {
		const fade = 1 - clamp((storyProgress - 0.06) / 0.2, 0, 1);
		return {
			x: 0.45 + fade * 0.55,
			y: fade
		};
	};

	const applyPointer = duration => {
		const factors = coverFactors();

		pointerTween?.kill();
		pointerTween = gsap.to(root, {
			"--mx": pointerX.toFixed(4),
			"--my": pointerY.toFixed(4),
			"--cover-mx": (pointerX * factors.x).toFixed(4),
			"--cover-my": (pointerY * factors.y).toFixed(4),
			duration,
			ease: "power3.out"
		});
	};

	syncCoverParallaxProgress = progress => {
		storyProgress = progress;
		applyPointer(0.08);
	};

	window.addEventListener(
		"pointermove",
		event => {
			if (event.pointerType === "touch") return;

			pointerX = (event.clientX / window.innerWidth - 0.5) * 2;
			pointerY = (event.clientY / window.innerHeight - 0.5) * 2;
			applyPointer(0.5);
		},
		{ passive: true }
	);

	window.addEventListener("pointerleave", () => {
		pointerX = 0;
		pointerY = 0;
		applyPointer(0.8);
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

function coverStartScale() {
	const baseWidth = window.innerHeight * coverMaskAspect;
	const mobile = window.matchMedia("(max-width: 900px)").matches;
	const maxPointerX = mobile ? 18 : 34;
	const maxPointerY = mobile ? 16 : 28;
	const visibleWidthRatio = mobile ? 0.58 : 0.52;
	const visibleHeightRatio = mobile ? 0.82 : 0.76;

	return Math.max((window.innerWidth + maxPointerX * 2) / (baseWidth * visibleWidthRatio), (window.innerHeight + maxPointerY * 2) / (window.innerHeight * visibleHeightRatio), 1);
}

function syncCoverBackgroundScale() {
	const mobile = window.matchMedia("(max-width: 900px)").matches;
	const maxShiftX = mobile ? 30 : 72;
	const maxShiftY = mobile ? 24 : 56;
	const scale = Math.max((window.innerWidth + maxShiftX * 2) / window.innerWidth, (window.innerHeight + maxShiftY * 2) / window.innerHeight) * 1.04;
	const commissionMaxShiftX = mobile ? 0 : 18;
	const commissionMaxShiftY = mobile ? 0 : 14;
	const commissionScale = Math.max((window.innerWidth + commissionMaxShiftX * 2) / window.innerWidth, (window.innerHeight + commissionMaxShiftY * 2) / window.innerHeight);

	document.documentElement.style.setProperty("--cover-bg-scale", scale.toFixed(4));
	document.documentElement.style.setProperty("--commission-bg-scale", commissionScale.toFixed(4));
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

function coverContentTargetMetrics() {
	const target = baseRect(document.querySelector(".about-portrait"));
	if (!target) return null;

	const scale = target.height / window.innerHeight;
	const contentWidth = window.innerWidth * scale;
	const contentHeight = window.innerHeight * scale;

	return {
		target,
		scale,
		contentLeft: target.left + target.width / 2 - contentWidth / 2,
		contentTop: target.top + target.height / 2 - contentHeight / 2
	};
}

function coverPortraitLayerLayout() {
	const metrics = coverContentTargetMetrics();
	if (!metrics) return {};

	const { target, scale, contentLeft, contentTop } = metrics;
	const mobile = window.matchMedia("(max-width: 900px)").matches;
	const maxBgShiftX = mobile ? 30 : 72;
	const maxBgShiftY = mobile ? 24 : 56;
	const bgBleedX = maxBgShiftX + 16;
	const bgBleedY = maxBgShiftY + 16;
	const avatarWidth = target.width * 1.1;
	const avatarLeft = target.left - avatarWidth * 0.049;

	return {
		avatarTop: (target.top - contentTop) / scale,
		avatarLeft: (avatarLeft - contentLeft) / scale + avatarWidth / scale / 2,
		avatarWidth: avatarWidth / scale,
		bgTop: (target.top - bgBleedY - contentTop) / scale,
		bgLeft: (target.left - bgBleedX - contentLeft) / scale,
		bgWidth: (target.width + bgBleedX * 2) / scale,
		bgHeight: (target.height + bgBleedY * 2) / scale
	};
}

function coverPortraitLayerValue(property) {
	return () => `${coverPortraitLayerLayout()[property] || 0}px`;
}

function coverTitleFollowTransform(axis) {
	return () => {
		const title = baseRect(document.querySelector(".cover-title"));
		const metrics = coverContentTargetMetrics();
		if (!title || !metrics) {
			if (axis === "scale") return 1;
			return 0;
		}

		const { scale, contentLeft, contentTop } = metrics;
		const sourceCenterX = title.left + title.width / 2;
		const sourceCenterY = title.top + title.height / 2;
		const targetCenterX = contentLeft + sourceCenterX * scale;
		const targetCenterY = contentTop + sourceCenterY * scale;

		if (axis === "x") return targetCenterX - sourceCenterX;
		if (axis === "y") return targetCenterY - sourceCenterY;
		if (axis === "scale") return scale;

		return 0;
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

function alignToViewportCenter(fromSelector, axis) {
	return () => {
		const from = baseRect(document.querySelector(fromSelector));
		if (!from) return 0;

		if (axis === "x") return window.innerWidth / 2 - (from.left + from.width / 2);
		if (axis === "y") return window.innerHeight / 2 - (from.top + from.height / 2);

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

function scaleToCoverViewport(fromSelector, overscan = 1.12) {
	return () => {
		const from = baseRect(document.querySelector(fromSelector));
		if (!from) return 1;

		return Math.max(window.innerWidth / from.width, window.innerHeight / from.height) * overscan;
	};
}

function rectCenter(rect) {
	return {
		cx: rect.left + rect.width / 2,
		cy: rect.top + rect.height / 2,
		width: rect.width,
		height: rect.height
	};
}

function aboutHeadPortalRect() {
	const rect = baseRect(document.querySelector(".about-head"));
	if (rect) return rectCenter(rect);

	return {
		cx: window.innerWidth / 2,
		cy: window.innerHeight / 2,
		width: 240,
		height: 240
	};
}

function fullPortalRect() {
	const height = Math.max(window.innerHeight * 1.46, (window.innerWidth * 1.46) / portalMaskAspect);

	return {
		cx: window.innerWidth / 2,
		cy: window.innerHeight / 2,
		width: height * portalMaskAspect,
		height
	};
}

function pinchedFullPortalRect() {
	const rect = fullPortalRect();

	return {
		...rect,
		width: Math.max(14, rect.width * 0.035)
	};
}

function exitCoverPortalRect() {
	const width = Math.min(window.innerWidth * 0.62, window.innerHeight * portalMaskAspect * 0.84);
	const height = width / portalMaskAspect;

	return {
		cx: window.innerWidth * 0.53,
		cy: window.innerHeight * 0.5,
		width,
		height
	};
}

function galleryTransitionSquareRect() {
	const card = document.querySelector(".gallery-card.is-transition");
	const section = document.querySelector(".gallery-section");
	const track = document.querySelector(".gallery-track");
	if (!card) return { left: window.innerWidth * 0.55, top: window.innerHeight * 0.52, width: 296, height: 296 };

	const previousSectionTransform = section?.style.transform;
	const previousTrackTransform = track?.style.transform;
	const previousCardTransform = card.style.transform;

	if (section) section.style.transform = "";
	if (track) track.style.transform = "";
	card.style.transform = "";

	const rect = card.getBoundingClientRect();

	if (section) section.style.transform = previousSectionTransform || "";
	if (track) track.style.transform = previousTrackTransform || "";
	card.style.transform = previousCardTransform;

	const size = Math.min(rect.width, rect.height);
	return {
		left: rect.left + (rect.width - size) / 2,
		top: rect.top + (rect.height - size) / 2,
		width: size,
		height: size
	};
}

function galleryTransitionRadius() {
	const card = document.querySelector(".gallery-card.is-transition");
	if (!card) return 29;

	return parseFloat(getComputedStyle(card).borderTopLeftRadius) || 29;
}

function commissionExitSourceRect() {
	const head = baseRect(document.querySelector(".commission-head:not(.commission-portal-head)"));
	const fallbackSize = Math.min(window.innerWidth, window.innerHeight) * 0.74;
	const size = head ? Math.min(head.width * 1.03, Math.min(window.innerWidth, window.innerHeight) * 0.86) : fallbackSize;
	const cx = head ? head.left + head.width / 2 : window.innerWidth / 2;
	const cy = head ? head.top + head.height / 2 : window.innerHeight / 2;

	return {
		left: clamp(cx - size / 2, 0, window.innerWidth - size),
		top: clamp(cy - size / 2, 0, window.innerHeight - size),
		width: size,
		height: size
	};
}

function commissionExitClipPath() {
	const from = commissionExitSourceRect();
	const to = galleryTransitionSquareRect();
	const right = window.innerWidth - from.left - from.width;
	const bottom = window.innerHeight - from.top - from.height;
	const radius = galleryTransitionRadius() / (to.width / from.width);

	return `inset(${from.top}px ${right}px ${bottom}px ${from.left}px round ${radius}px)`;
}

function commissionExitTransform(axis) {
	return () => {
		const from = commissionExitSourceRect();
		const to = galleryTransitionSquareRect();
		const scale = to.width / from.width;

		if (axis === "scale") return scale;
		if (axis === "x") return to.left - from.left * scale;
		if (axis === "y") return to.top - from.top * scale;

		return 0;
	};
}

function portalVars(rectGetter, { rotation = 0, worldY = 0 } = {}) {
	const readRect = () => rectGetter();

	return {
		"--portal-left": () => {
			const rect = readRect();
			return `${rect.cx - rect.width / 2}px`;
		},
		"--portal-top": () => {
			const rect = readRect();
			return `${rect.cy - rect.height / 2}px`;
		},
		"--portal-width": () => `${readRect().width}px`,
		"--portal-height": () => `${readRect().height}px`,
		"--portal-origin-x": () => `${readRect().cx}px`,
		"--portal-origin-y": () => `${readRect().cy}px`,
		"--portal-rotation": () => `${rotation}deg`,
		"--portal-world-rotation": () => `${-rotation}deg`,
		"--portal-world-y": () => `${worldY}px`
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
			const initialCoverScale = coverStartScale();
			const aboutIn = mobile ? 0.12 : 0.1;
			const aboutTitleIn = mobile ? 0.25 : 0.12;
			const aboutCopyIn = mobile ? 0.29 : 0.17;
			const aboutSoftIn = mobile ? 0.3 : 0.19;
			const aboutHeadIn = mobile ? 0.29 : 0.19;
			const aboutTextClearAt = mobile ? 0.412 : 0.36;
			const commissionTurnStart = 0.43;
			const commissionFrontEdgeAt = 0.47725;
			const commissionBackSettledAt = 0.5275;
			const commissionRevealSettledAt = 0.56;

			resetCoverAvatarLayout();
			gsap.set(".cover-section", { autoAlpha: 1 });
			gsap.set(".cover-title, .scroll-cue", { autoAlpha: 1, clearProps: "transform,willChange", transformOrigin: "50% 50%" });
			gsap.set(".cover-parallax-frame", { clearProps: "transform" });
			gsap.set(".cover-bg", { clearProps: "top,left,right,bottom,width,height" });
			gsap.set(".cover-scene", {
				autoAlpha: 1,
				x: 0,
				y: 0,
				scale: initialCoverScale,
				rotateX: 0,
				rotateY: 0,
				rotation: 0,
				transformPerspective: 1200
			});
			gsap.set(".cover-content", {
				x: 0,
				y: 0,
				scale: 1 / initialCoverScale,
				rotateX: 0,
				rotateY: 0,
				rotation: 0,
				transformOrigin: "50% 50%"
			});
			gsap.set(".cover-world", {
				scale: 1,
				rotateX: 0,
				rotateY: 0,
				rotation: 0,
				transformOrigin: "50% 50%"
			});
			gsap.set(".cover-avatar", readCoverAvatarLayout());
			gsap.set(".about-section, .commission-section, .gallery-section", { autoAlpha: 0 });
			gsap.set(".commission-section", { clearProps: "transform", transformOrigin: "0 0", clipPath: "inset(0px 0px 0px 0px round 0px)" });
			gsap.set(".about-title", mobile ? { autoAlpha: 0, x: 72, y: 0 } : { autoAlpha: 0, x: 0, y: -72 });
			gsap.set(".about-copy", { autoAlpha: 0, y: 28 });
			gsap.set(".about-feier", { autoAlpha: 0, y: 28 });
			gsap.set(".about-head", {
				autoAlpha: 0,
				"--about-head-y": "28px",
				x: 0,
				y: 0,
				scale: 1,
				rotateY: 0,
				transformPerspective: mobile ? 900 : 1200,
				transformOrigin: "50% 50%"
			});
			gsap.set(".commission-bg", { autoAlpha: 0 });
			gsap.set(".commission-copy", { autoAlpha: 0, y: 46 });
			gsap.set(".commission-portal-copy", { autoAlpha: 0, y: 0, clearProps: "willChange" });
			gsap.set(".commission-head", { clearProps: "transform" });
			gsap.set(".commission-head:not(.commission-portal-head)", { autoAlpha: 0 });
			gsap.set(".commission-portal", { autoAlpha: 0, clipPath: portalTurnClip, ...portalVars(pinchedFullPortalRect) });
			gsap.set(".commission-portal-world", { autoAlpha: 1 });
			gsap.set(".gallery-section", { autoAlpha: 1, y: "138vh" });
			gsap.set(".gallery-section h2, .gallery-intro", { autoAlpha: 1, clearProps: "transform,willChange" });
			gsap.set(".gallery-card", { autoAlpha: 1, y: 0 });
			gsap.set(".gallery-card.is-transition", {
				autoAlpha: 0,
				y: 0,
				rotateY: 0,
				scale: 1,
				transformPerspective: mobile ? 800 : 1100,
				transformOrigin: "50% 50%"
			});
			const tl = gsap.timeline({
				defaults: { ease: "none" },
				scrollTrigger: {
					id: "story",
					trigger: storyScroll,
					start: "top top",
					end: "bottom bottom",
					scrub: storyScrub,
					invalidateOnRefresh: true,
					onUpdate: self => {
						setThemeByProgress(self.progress);
						syncCoverParallaxProgress(self.progress);
						setGalleryMarqueeActive((self.animation?.progress() || self.progress) > 0.955);

						const isCoverActive = self.progress < 0.035;
						if (isCoverActive && !coverWasActive) playInkSweep();
						if (!isCoverActive) coverScene?.classList.add("is-ink-complete");
						coverWasActive = isCoverActive;
					}
				}
			});

			tl.to({}, { duration: 1 }, 0);
			tl.set(".about-section", { autoAlpha: 1 }, aboutIn);
			tl.to(
				".cover-scene",
				{
					x: alignToElement(".cover-scene", ".about-portrait", "x"),
					y: alignToElement(".cover-scene", ".about-portrait", "y"),
					scale: scaleToElementHeight(".cover-scene", ".about-portrait"),
					rotateX: 0,
					rotateY: 0,
					rotation: 0,
					duration: 0.25,
					ease: "power2.out"
				},
				0.04
			);
			tl.to(
				".cover-content",
				{
					scale: 1,
					rotateY: 0,
					duration: 0.25,
					ease: "power2.out"
				},
				0.04
			);
			tl.to(
				".cover-bg",
				{
					top: coverPortraitLayerValue("bgTop"),
					left: coverPortraitLayerValue("bgLeft"),
					right: "auto",
					bottom: "auto",
					width: coverPortraitLayerValue("bgWidth"),
					height: coverPortraitLayerValue("bgHeight"),
					duration: 0.25,
					ease: "power2.out"
				},
				0.04
			);
			tl.to(
				".cover-avatar",
				{
					top: coverPortraitLayerValue("avatarTop"),
					left: coverPortraitLayerValue("avatarLeft"),
					width: coverPortraitLayerValue("avatarWidth"),
					duration: 0.25,
					ease: "power2.out"
				},
				0.04
			);
			if (mobile) {
				tl.to(".cover-title", { autoAlpha: 0, y: -18, duration: 0.11 }, 0.1);
			} else {
				tl.to(
					".cover-title",
					{
						x: coverTitleFollowTransform("x"),
						y: coverTitleFollowTransform("y"),
						scale: coverTitleFollowTransform("scale"),
						duration: 0.25,
						ease: "power2.out"
					},
					0.04
				);
				tl.to(".cover-title", { autoAlpha: 0, duration: 0.22, ease: "none" }, 0.06);
			}
			tl.to(".scroll-cue", { autoAlpha: 0, y: mobile ? -18 : -32, duration: 0.11 }, 0.1);
			tl.to(".about-title", { autoAlpha: 1, x: 0, y: 0, duration: 0.12 }, aboutTitleIn);
			tl.to(".about-copy", { autoAlpha: 1, y: 0, stagger: 0.025, duration: 0.12 }, aboutCopyIn);
			tl.to(".about-feier", { autoAlpha: 1, y: 0, duration: 0.12 }, aboutSoftIn);
			tl.to(".about-head", { autoAlpha: 1, "--about-head-y": "0px", duration: 0.12 }, aboutHeadIn);
			tl.set(".about-title, .about-copy", { clearProps: "transform,willChange" }, aboutTextClearAt);

			tl.set(".commission-section", { autoAlpha: 1 }, commissionTurnStart);
			tl.to(".cover-scene", { autoAlpha: 0, duration: 0.1 }, 0.42);
			tl.set(".about-head", { zIndex: 8, transition: "none" }, commissionTurnStart);
			tl.to(".about-title, .about-copy, .about-feier, .about-portrait", { autoAlpha: 0, y: -20, duration: 0.08 }, commissionTurnStart);
			tl.to(
				".about-head",
				{
					x: alignToViewportCenter(".about-head", "x"),
					y: alignToViewportCenter(".about-head", "y"),
					scale: scaleToCoverViewport(".about-head", mobile ? 1.28 : 1.16),
					duration: 0.063,
					ease: "power2.in"
				},
				commissionTurnStart
			);
			tl.to(
				".about-head",
				{
					rotateY: 90,
					duration: 0.04725,
					ease: "power2.in"
				},
				commissionTurnStart
			);
			tl.set(".about-head", { autoAlpha: 0 }, commissionFrontEdgeAt);
			tl.set(
				".commission-portal",
				{
					...portalVars(fullPortalRect),
					clipPath: portalTurnClip,
					autoAlpha: 1,
					rotation: 0,
					transformOrigin: "50% 50%"
				},
				commissionFrontEdgeAt
			);
			tl.to(".commission-portal", { clipPath: portalMidTurnClip, duration: commissionBackSettledAt - commissionFrontEdgeAt, ease: "power1.out" }, commissionFrontEdgeAt);
			tl.to(".commission-portal", { clipPath: portalFlatClip, duration: commissionRevealSettledAt - commissionBackSettledAt, ease: "power2.out" }, commissionBackSettledAt);
			tl.set(".commission-bg, .commission-head:not(.commission-portal-head)", { autoAlpha: 1 }, commissionRevealSettledAt);
			tl.to(".commission-copy", { autoAlpha: 1, y: 0, duration: 0.12, ease: "power2.out" }, commissionRevealSettledAt);
			tl.set(".commission-portal", { autoAlpha: 0 }, commissionRevealSettledAt);
			tl.set(".about-section", { autoAlpha: 0 }, commissionRevealSettledAt);
			tl.set(".commission-copy", { clearProps: "transform,willChange" }, commissionRevealSettledAt + 0.13);
			tl.set(".gallery-section", { y: 0 }, 0.8);
			tl.set(".gallery-section", { clearProps: "transform" }, 0.801);
			tl.set(".gallery-section h2, .gallery-intro", { clearProps: "transform,willChange" }, 0.801);
			tl.to(".commission-copy", { autoAlpha: 0, y: -28, duration: 0.09, ease: "power1.out" }, 0.8);
			tl.to(
				".commission-section",
				{
					x: commissionExitTransform("x"),
					y: commissionExitTransform("y"),
					scale: commissionExitTransform("scale"),
					clipPath: commissionExitClipPath,
					duration: 0.155,
					ease: "power3.inOut"
				},
				0.8
			);
			tl.set(".gallery-card.is-transition", { autoAlpha: 1, rotateY: 0, scale: 1 }, 0.955);
			tl.set(".commission-section", { autoAlpha: 0 }, 0.955);
			tl.set(".commission-section, .commission-copy", { clearProps: "transform,willChange" }, 0.956);

			setThemeByProgress(ScrollTrigger.getById("story")?.progress || 0);
			clearReadableTextTransforms(".cover-title, .scroll-cue");
			playInkSweep();
		}
	);
}

function initReducedStory() {
	setChromeTheme("cover");
	const initialCoverScale = coverStartScale();

	gsap.set(".section", { autoAlpha: 0 });
	gsap.set(".cover-section", { autoAlpha: 1 });
	gsap.set(".cover-title, .scroll-cue", { autoAlpha: 1, clearProps: "transform,willChange" });
	gsap.set(".cover-parallax-frame", { clearProps: "transform" });
	gsap.set(".cover-bg", { clearProps: "top,left,right,bottom,width,height" });
	gsap.set(".cover-scene", {
		autoAlpha: 1,
		x: 0,
		y: 0,
		scale: initialCoverScale,
		rotateX: 0,
		rotateY: 0,
		rotation: 0,
		transformPerspective: 1200
	});
	gsap.set(".cover-content", {
		x: 0,
		y: 0,
		scale: 1 / initialCoverScale,
		rotateX: 0,
		rotateY: 0,
		rotation: 0,
		transformOrigin: "50% 50%"
	});
	gsap.set(".cover-world", {
		scale: 1,
		rotateX: 0,
		rotateY: 0,
		rotation: 0,
		transformOrigin: "50% 50%"
	});
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

syncCoverBackgroundScale();
window.addEventListener("resize", syncCoverBackgroundScale);

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
