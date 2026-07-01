# GSAP Portal Mask Morph 實作說明

你的目標不是把內容變形，而是讓「洞口 / mask 邊界」像 3D 旋轉一樣變形。

所以架構要這樣拆：

```txt
current world：原本畫面，不套 transform，不變形
next world：下一個世界，只被 portal mask 顯示
portal path：真正控制可視範圍的 SVG path
portal rim / glow / shadow：獨立的邊框與立體感特效
GSAP：只 morph SVG path，不 rotate 內容層
```

重點：**不要對 `.next-world` 或 `.stage` 做 `rotateX()` / `rotateY()`**。  
那會讓洞裡的圖片、影片、文字、canvas 一起透視變形。

我們要做的是：

```txt
內容保持正常
↓
只有 mask / clip path 的輪廓 morph
↓
邊框、光暈、陰影同步 morph
↓
視覺上像 portal 在立體旋轉
```

---

## 1. 你的兩個 SVG 狀況

你現在有兩個 SVG：

```txt
mask-portrait.svg
viewBox = 0 0 533 806
尺寸比例偏直式

mask-square.svg
viewBox = 0 0 256 240
尺寸比例偏方形
```

兩個 SVG 都是單一 `<path>`，這點很好，適合做 GSAP MorphSVG。

但它們的 `viewBox` 不一樣，所以不能直接把兩段 path 拿來硬 morph。建議先選一個主座標系，我這裡用 `mask-portrait.svg` 的座標：

```html
<svg viewBox="0 0 533 806">
```

然後把 `mask-square.svg` 的 path 轉到同一個 `533 × 806` 座標系裡。

---

## 2. 技術選型

### 推薦主線

```txt
SVG clipPath / mask
+
GSAP MorphSVGPlugin
+
多層 portal rim / glow / shadow
```

### 為什麼用 MorphSVGPlugin？

你的兩個 SVG path 指令結構不完全一樣：

```txt
portrait：主要是 M + C + C + C...
square：有 M + C + H + V + L + C...
```

如果只用 GSAP core 的：

```js
attr: { d: nextPath }
```

在兩個 path 指令數量、結構不同時，morph 很容易失敗或變得很怪。

MorphSVGPlugin 的用途就是讓不同 SVG path 可以被補點、配對、morph，所以這裡比較適合。

---

## 3. HTML 結構

這個版本用 `clipPath` 控制下一個世界的可視範圍。  
如果你需要柔邊，後面有 `SVG mask` 版本。

```html
<section class="portal-stage">
  <div class="world current-world">
    <!-- 原本的畫面。完全不要 transform。 -->
  </div>

  <div class="world next-world">
    <!-- 下一個世界，可以是圖片、影片、canvas、Three.js scene、DOM 內容 -->
  </div>

  <svg
    class="portal-svg"
    viewBox="0 0 533 806"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <clipPath id="portalClip" clipPathUnits="userSpaceOnUse">
        <path id="portalClipPath" d="" />
      </clipPath>
    </defs>

    <!-- 視覺厚度：陰影放在最底 -->
    <path id="portalShadow" d="" fill="none" />

    <!-- 外光暈 -->
    <path id="portalGlow" d="" fill="none" />

    <!-- 真正邊框 -->
    <path id="portalRim" d="" fill="none" />
  </svg>
</section>
```

---

## 4. CSS

```css
.portal-stage {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  isolation: isolate;
  background: #05070c;
}

.world {
  position: absolute;
  inset: 0;
}

.current-world {
  z-index: 1;
}

.next-world {
  z-index: 2;
  clip-path: url(#portalClip);
  opacity: 0;

  /* 內容本身可以有一點點 scale，但不要 rotateX / rotateY */
  transform: scale(1.03);
  transform-origin: center;
  will-change: opacity, transform;
}

.portal-svg {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

#portalShadow {
  stroke: rgba(0, 0, 0, 0.55);
  stroke-width: 34;
  filter: blur(14px);
  transform: translateY(18px);
  opacity: 0;
}

#portalGlow {
  stroke: rgba(120, 190, 255, 0.65);
  stroke-width: 28;
  filter: blur(18px);
  opacity: 0;
}

#portalRim {
  stroke: rgba(210, 235, 255, 0.95);
  stroke-width: 7;
  filter: drop-shadow(0 0 16px rgba(120, 190, 255, 0.9));
  opacity: 0;
}
```

---

## 5. Path 資料

下面已經把你的 `mask-square.svg` 轉到 `533 × 806` 座標系內。  
`portrait` 是原始直式 mask。  
`square` 是轉換後的方形 mask。  
`tiltDown` 是拿來假裝「洞口往下旋轉」的中間形狀。

```js
const PATHS = {
  portrait: `
    M533 734.338
    C533 747.068 527.943 759.277 518.941 768.279
    L495.279 791.941
    C486.277 800.943 474.068 806 461.338 806
    H72
    C45.4904 806 24 784.51 24 758
    V530.971
    C24 520.104 19.6835 509.683 12 502
    C4.31653 494.317 0 483.896 0 473.029
    V48
    C0 21.4903 21.4903 0 48 0
    H309.511
    C322.242 0 334.451 5.05768 343.453 14.0603
    L363.331 33.9397
    C372.333 42.9423 384.542 48 397.273 48
    H485
    C511.51 48 533 69.4903 533 96
    V734.338
    Z
  `,

  square: `
    M 32.271 203.125
    C 32.271 175.528 54.643 153.156 82.24 153.156
    L 481.99 153.156
    C 509.588 153.156 531.959 175.528 531.959 203.125
    L 531.959 565.521
    C 531.959 578.773 526.694 591.484 517.324 600.853
    L 479.969 638.209
    C 470.599 647.578 457.889 652.844 444.637 652.844
    L 49.969 652.844
    C 22.372 652.844 0 630.472 0 602.875
    L 0 460.137
    C 0 446.294 5.863 433.1 16.136 423.82
    C 26.409 414.541 32.271 401.347 32.271 387.503
    L 32.271 203.125
    Z
  `,

  tiltDown: `
    M 99.26 327.065
    C 103.659 312.715 122.437 301.081 141.203 301.081
    L 413.033 301.081
    C 431.8 301.081 451.053 312.715 456.038 327.065
    L 521.495 515.511
    C 523.889 522.402 521.035 529.012 513.467 533.884
    L 482.113 553.309
    C 473.95 558.181 461.717 560.919 448.2 560.919
    L 45.638 560.919
    C 17.489 560.919 -1.273 549.285 3.731 534.935
    L 29.614 460.711
    C 32.124 453.513 39.621 446.652 50.144 441.826
    C 60.537 437.001 67.669 430.14 69.875 422.942
    L 99.26 327.065
    Z
  `
};
```

---

## 6. GSAP 動畫

```js
import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

// 必須註冊 MorphSVGPlugin
// CDN 用法則是確認 MorphSVGPlugin 已經載入後再 register。
gsap.registerPlugin(MorphSVGPlugin);

const morphTargets = [
  "#portalClipPath",
  "#portalShadow",
  "#portalGlow",
  "#portalRim"
];

// 初始狀態：全部 path 都是 portrait
// 這樣 clip 範圍、shadow、glow、rim 會完全同步。
gsap.set(morphTargets, {
  attr: { d: PATHS.portrait }
});

gsap.set(".next-world", {
  opacity: 0,
  scale: 1.03
});

gsap.set(["#portalShadow", "#portalGlow", "#portalRim"], {
  opacity: 0
});

const portalTl = gsap.timeline({
  paused: true,
  defaults: {
    ease: "power3.inOut"
  }
});

portalTl
  // portal 開始出現
  .to(".next-world", {
    opacity: 1,
    scale: 1,
    duration: 0.5
  }, 0)

  .to(["#portalShadow", "#portalGlow", "#portalRim"], {
    opacity: 1,
    duration: 0.35
  }, 0)

  // 第一段：從直式洞口壓成一個往下傾斜的 portal
  .to(morphTargets, {
    duration: 0.8,
    morphSVG: {
      shape: PATHS.tiltDown,
      type: "rotational"
    }
  }, 0)

  // 第二段：打開到方形世界
  .to(morphTargets, {
    duration: 0.9,
    morphSVG: {
      shape: PATHS.square,
      type: "rotational"
    }
  }, 0.65)

  // 增加一點 portal energy
  .to("#portalGlow", {
    strokeWidth: 42,
    opacity: 0.95,
    duration: 0.35,
    yoyo: true,
    repeat: 1,
    ease: "power2.out"
  }, 0.35);

// 例如：hover 開啟，離開關閉
document.querySelector(".portal-stage").addEventListener("mouseenter", () => {
  portalTl.play();
});

document.querySelector(".portal-stage").addEventListener("mouseleave", () => {
  portalTl.reverse();
});
```

---

## 7. ScrollTrigger 版本

如果你要它跟著滾動展開：

```js
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(MorphSVGPlugin, ScrollTrigger);

const portalTl = gsap.timeline({
  scrollTrigger: {
    trigger: ".portal-stage",
    start: "top top",
    end: "+=1200",
    scrub: true,
    pin: true
  }
});

portalTl
  .set(morphTargets, { attr: { d: PATHS.portrait } })
  .to(".next-world", {
    opacity: 1,
    scale: 1,
    duration: 0.3
  }, 0)
  .to(["#portalShadow", "#portalGlow", "#portalRim"], {
    opacity: 1,
    duration: 0.25
  }, 0)
  .to(morphTargets, {
    morphSVG: {
      shape: PATHS.tiltDown,
      type: "rotational"
    },
    duration: 0.5
  }, 0.1)
  .to(morphTargets, {
    morphSVG: {
      shape: PATHS.square,
      type: "rotational"
    },
    duration: 0.7
  }, 0.55);
```

---

## 8. 如果你一定要用真正的 SVG mask，而不是 clipPath

`clipPath` 是硬邊。  
如果你想要洞口邊緣有柔邊、alpha、半透明衰減，可以改成 SVG `<mask>`。

適合情境：

```txt
portal 邊緣有 feather
洞口邊緣不是硬切
需要 alpha 漸層
需要讓 portal 像能量場
```

基本概念：

```html
<svg
  class="portal-mask-svg"
  viewBox="0 0 533 806"
  preserveAspectRatio="none"
>
  <defs>
    <filter id="portalFeather">
      <feGaussianBlur stdDeviation="8" />
    </filter>

    <mask id="portalMask" maskUnits="userSpaceOnUse">
      <rect width="533" height="806" fill="black" />

      <!-- 白色區域代表可見區域 -->
      <path
        id="portalMaskPath"
        d=""
        fill="white"
        filter="url(#portalFeather)"
      />
    </mask>
  </defs>

  <foreignObject width="533" height="806" mask="url(#portalMask)">
    <div xmlns="http://www.w3.org/1999/xhtml" class="next-world-inner">
      <!-- 下一個世界內容 -->
    </div>
  </foreignObject>
</svg>
```

然後 GSAP 一樣 morph：

```js
gsap.to("#portalMaskPath", {
  duration: 1,
  morphSVG: {
    shape: PATHS.tiltDown,
    type: "rotational"
  },
  ease: "power3.inOut"
});
```

不過注意：`foreignObject` 對複雜 DOM、影片、canvas 的行為要實測。  
如果你只是要硬邊 portal，`clipPath + rim/glow/shadow` 通常更穩。

---

## 9. 外部 SVG mask 的限制

如果你現在是這樣用：

```css
.next-world {
  mask-image: url("/mask-portrait.svg");
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  mask-position: center;
}
```

這種做法適合靜態 mask，但不適合做 path morph。

原因是：GSAP 沒有辦法很方便地直接改外部 SVG 檔案裡面的 `<path d="...">`。

如果要做 portal morph，建議改成：

```txt
把 SVG path inline 到 HTML / component 裡
↓
給 path id
↓
GSAP morph path d
↓
同一條 path 同步控制 clip / mask / rim / glow / shadow
```

---

## 10. 實作重點總結

### 不要這樣做

```css
.next-world {
  transform: rotateX(60deg);
}
```

這會讓洞裡的世界一起變形。

---

### 要這樣做

```txt
1. current-world 不動
2. next-world 只被 portalClip / portalMask 顯示
3. portalClipPath 用 GSAP MorphSVG 改 d
4. portalRim / portalGlow / portalShadow 跟著同一個 path morph
5. 用 tiltDown 這種中間 path 假裝 3D 旋轉
```

---

## 11. 最小可用版本

```js
gsap.registerPlugin(MorphSVGPlugin);

const targets = ["#portalClipPath", "#portalRim", "#portalGlow", "#portalShadow"];

gsap.set(targets, {
  attr: { d: PATHS.portrait }
});

gsap.timeline()
  .to(".next-world", {
    opacity: 1,
    duration: 0.4
  }, 0)
  .to(targets, {
    morphSVG: {
      shape: PATHS.tiltDown,
      type: "rotational"
    },
    duration: 0.8,
    ease: "power3.inOut"
  }, 0)
  .to(targets, {
    morphSVG: {
      shape: PATHS.square,
      type: "rotational"
    },
    duration: 0.8,
    ease: "power3.inOut"
  });
```

這樣就能做到：

```txt
mask 邊界像 3D portal 一樣轉動
洞裡面的內容不會被壓扁、不會 skew、不會 rotate
只有可視範圍變化
```
