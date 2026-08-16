import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ShoppingBag,
  Upload,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  RotateCcw,
  ImagePlus,
} from "lucide-react";
import image1 from './Painting1.jpg'
import '../Canvas.css'
/* ----------------------------------------------------------------------- */
/*  Data                                                                    */
/* ----------------------------------------------------------------------- */
const PAINTINGS = [
  { id: "rp-sq30", ImgSrc:"./Painting1.jpg", name: "Small Square", shape: "rect", w: 90, h:130, base: 5000 },
  { id: "rp-pt40x60",ImgSrc:"./Painting1.jpg", name: "Portrait", shape: "rect", w: 50, h: 40, base: 7000 },
  { id: "rp-ls60x40",ImgSrc:"./Painting1.jpg", name: "Landscape", shape: "rect", w: 60, h: 40, base: 9000 },
  { id: "rp-lg80x100",ImgSrc:"./Painting1.jpg", name: "Grand Format", shape: "rect", w: 80, h: 100, base: 12000 },
  { id: "rp-rd30",ImgSrc:"./Painting1.jpg", name: "Round — Small", shape: "round", w: 25, h: 25, base: 4000 },
  { id: "rp-rd50",ImgSrc:"./Painting1.jpg", name: "Round — Medium", shape: "round", w: 50, h: 50, base: 8000 },
  { id: "rp-rd70",ImgSrc:"./Painting3.jpg", name: "Round — Large", shape: "round", w: 100, h: 100, base: 1100 },
  { id: "rp-rd90",ImgSrc:"./Painting4.png", name: "Round — Huge", shape: "round", w: 130, h: 130, base: 1400 }
];

const SIZES = [
  { id: "sq30", name: "Small Square", shape: "rect", w: 40, h: 30, base: 5000 },
  { id: "pt40x60", name: "Portrait", shape: "rect", w: 50, h: 40, base: 7000 },
  { id: "ls60x40", name: "Landscape", shape: "rect", w: 60, h: 40, base: 9000 },
  { id: "lg80x100", name: "Grand Format", shape: "rect", w: 80, h: 100, base: 12000 },
  { id: "rd30", name: "Round — Small", shape: "round", w: 25, h: 25, base: 4000 },
  { id: "rd50", name: "Round — Medium", shape: "round", w: 50, h: 50, base: 8000 },
  { id: "rd70", name: "Round — Large", shape: "round", w: 70, h: 70, base: 1100 },
  { id: "rd90", name: "Round — Huge", shape: "round", w: 90, h: 90, base: 1400 }
];
const Emptyandready=[...SIZES,...PAINTINGS]
console.log(Emptyandready)
const PAINTS = [
  {
    id: "acrylic",
    name: "Acrylic",
    mult: 1.2,
    desc: "Fast-drying pigment with a bright, even satin finish. The dependable studio standard.",
  },
  {
    id: "oil",
    name: "Oil",
    mult: 1.6,
    desc: "Hand-blended by our painters over several sessions. Deep color, visible brushwork, slow-cured.",
  },
  {
    id: "watercolor",
    name: "Watercolor",
    mult: 0.85,
    desc: "Soft, translucent washes on cold-press stock. Light, airy, and a little unpredictable — on purpose.",
  },
  {
    id: "print",
    name: "Archival Print",
    mult: 0.5,
    desc: "A pigment-ink reproduction of your photo, no hand-painting. Sharp detail, fastest turnaround.",
  },
];

const priceFor = (size, paint) => Math.round(size.base * paint.mult);

const cropDims = (size) => {
  const base = 320;
  let w = base;
  let h = size.shape === "round" ? base : base * (size.h / size.w);
  const maxH = 440;
  if (h > maxH) {
    const s = maxH / h;
    h = maxH;
    w = w * s;
  }
  return { w: Math.round(w), h: Math.round(h) };
};

const scalePxPerCm = 1.15;
const visualBox = (size) => {
  if (size.shape === "round") {
    const d = Math.max(28, size.w * scalePxPerCm);
    return { w: d, h: d };
  }
  return {
    w: Math.max(24, size.w * scalePxPerCm),
    h: Math.max(24, size.h * scalePxPerCm),
  };
};

const STEPS = ["Size", "Image", "Type", "Review"];

/* ----------------------------------------------------------------------- */
/*  Small building blocks                                                   */
/* ----------------------------------------------------------------------- */

function Label({ left, right, size = "sm" }) {
  return (
    <div className={`plinth-label plinth-label--${size}`}>
      <span className="plinth-label__left">{left}</span>
      <span className="plinth-label__leader" aria-hidden="true" />
      <span className="plinth-label__right">{right}</span>
    </div>
  );
}

function StepIndicator({ current }) {
  return (
    <div className="plinth-steps" role="list">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const state = n === current ? "active" : n < current ? "done" : "idle";
        return (
          <div className="plinth-step" data-state={state} key={s} role="listitem">
            <span className="plinth-step__num">
              {state === "done" ? <Check size={11} strokeWidth={3} /> : String(n).padStart(2, "0")}
            </span>
            <span className="plinth-step__name">{s}</span>
            {n < STEPS.length && <span className="plinth-step__rule" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}

function PaintSwatch({ id }) {
  return <div className={`plinth-swatch plinth-swatch--${id}`} aria-hidden="true" />;
}

/* ----------------------------------------------------------------------- */
/*  Crop / fit stage                                                        */
/* ----------------------------------------------------------------------- */
function ReadyImageFitReview({ size, config, setConfig, imgElRef,readypainting }) {
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const { w: cw, h: ch } = cropDims(size);

  const baseScale = config.natW
    ? Math.max(cw / config.natW, ch / config.natH)
    : 1;
  const drawW = config.natW ? config.natW * baseScale * config.zoom : 0;
  const drawH = config.natH ? config.natH * baseScale * config.zoom : 0;

  const clamp = useCallback(
    (ox, oy, dW, dH) => {
      const maxX = Math.max(0, (dW - cw) / 2);
      const maxY = Math.max(0, (dH - ch) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, ox)),
        y: Math.min(maxY, Math.max(-maxY, oy)),
      };
    },
    [cw, ch]
  );

  const onPointerDown = (e) => {
    if (!config.src) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setConfig((c) => {
      const next = clamp(c.offX + e.movementX, c.offY + e.movementY, drawW, drawH);
      return { ...c, offX: next.x, offY: next.y };
    });
  };
  const onPointerUp = (e) => {
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const onZoom = (val) => {
    setConfig((c) => {
      const newZoom = val;
      const nDrawW = c.natW * baseScale * newZoom;
      const nDrawH = c.natH * baseScale * newZoom;
      const next = clamp(c.offX, c.offY, nDrawW, nDrawH);
      return { ...c, zoom: newZoom, offX: next.x, offY: next.y };
    });
  };

  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = readypainting
      const img = readypainting.Image();
      
        setConfig({
          src,
          img,
          natW: img.naturalWidth,
          natH: img.naturalHeight,
          zoom: 1,
          offX: 0,
          offY: 0,
        });
      
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="plinth-fit">
      <div className="plinth-fit__stage">
        <div
          ref={containerRef}
          className={`plinth-crop plinth-crop--${size.shape}`}
          style={{ width: cw, height: ch }}
          onPointerDown={onPointerDown}
          
          onPointerUp={onPointerUp}
        >
          {config.src ? (
            <img
              ref={imgElRef}
              src={config.src}
              alt="Uploaded artwork, drag to reposition"
              draggable={false}
              className="plinth-crop__img"
              style={{
                width: drawW,
                height: drawH,
                transform: `translate(-50%,-50%) translate(${config.offX}px, ${config.offY}px)`,
              }}
            />
          ) : (
            <img
            style={{
                width: cw,
                height: ch,
                
              }}
            src={readypainting}
             />
          )}
        </div>
        
      </div>
    </div>
  );
}
function ImageFitReview({ size, config, setConfig, imgElRef,readypainting }) {
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const { w: cw, h: ch } = cropDims(size);

  const baseScale = config.natW
    ? Math.max(cw / config.natW, ch / config.natH)
    : 1;
  const drawW = config.natW ? config.natW * baseScale * config.zoom : 0;
  const drawH = config.natH ? config.natH * baseScale * config.zoom : 0;

  const clamp = useCallback(
    (ox, oy, dW, dH) => {
      const maxX = Math.max(0, (dW - cw) / 2);
      const maxY = Math.max(0, (dH - ch) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, ox)),
        y: Math.min(maxY, Math.max(-maxY, oy)),
      };
    },
    [cw, ch]
  );

  const onPointerDown = (e) => {
    if (!config.src) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setConfig((c) => {
      const next = clamp(c.offX + e.movementX, c.offY + e.movementY, drawW, drawH);
      return { ...c, offX: next.x, offY: next.y };
    });
  };
  const onPointerUp = (e) => {
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const onZoom = (val) => {
    setConfig((c) => {
      const newZoom = val;
      const nDrawW = c.natW * baseScale * newZoom;
      const nDrawH = c.natH * baseScale * newZoom;
      const next = clamp(c.offX, c.offY, nDrawW, nDrawH);
      return { ...c, zoom: newZoom, offX: next.x, offY: next.y };
    });
  };

  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const img = new window.Image();
      img.onload = () => {
        setConfig({
          src,
          img,
          natW: img.naturalWidth,
          natH: img.naturalHeight,
          zoom: 1,
          offX: 0,
          offY: 0,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="plinth-fit">
      <div className="plinth-fit__stage">
        <div
          ref={containerRef}
          className={`plinth-crop plinth-crop--${size.shape}`}
          style={{ width: cw, height: ch }}
          onPointerDown={onPointerDown}
          
          onPointerUp={onPointerUp}
        >
          {config.src ? (
            <img
              ref={imgElRef}
              src={config.src}
              alt="Uploaded artwork, drag to reposition"
              draggable={false}
              className="plinth-crop__img"
              style={{
                width: drawW,
                height: drawH,
                transform: `translate(-50%,-50%) translate(${config.offX}px, ${config.offY}px)`,
              }}
            />
          ) : (
            <>
            <label className="plinth-crop__empty">
              <ImagePlus size={22} strokeWidth={1.5} />
              <span>Upload a photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onFile(e.target.files?.[0])}
                hidden
              />
            </label>
            </>
          )}
        </div>
        
      </div>
    </div>
  );
}

function ImageFitStage({ size, config, setConfig, imgElRef }) {
  const containerRef = useRef(null);
  const dragging = useRef(false);
  const { w: cw, h: ch } = cropDims(size);

  const baseScale = config.natW
    ? Math.max(cw / config.natW, ch / config.natH)
    : 1;
  const drawW = config.natW ? config.natW * baseScale * config.zoom : 0;
  const drawH = config.natH ? config.natH * baseScale * config.zoom : 0;

  const clamp = useCallback(
    (ox, oy, dW, dH) => {
      const maxX = Math.max(0, (dW - cw) / 2);
      const maxY = Math.max(0, (dH - ch) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, ox)),
        y: Math.min(maxY, Math.max(-maxY, oy)),
      };
    },
    [cw, ch]
  );

  const onPointerDown = (e) => {
    if (!config.src) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setConfig((c) => {
      const next = clamp(c.offX + e.movementX, c.offY + e.movementY, drawW, drawH);
      return { ...c, offX: next.x, offY: next.y };
    });
  };
  const onPointerUp = (e) => {
    dragging.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  const onZoom = (val) => {
    setConfig((c) => {
      const newZoom = val;
      const nDrawW = c.natW * baseScale * newZoom;
      const nDrawH = c.natH * baseScale * newZoom;
      const next = clamp(c.offX, c.offY, nDrawW, nDrawH);
      return { ...c, zoom: newZoom, offX: next.x, offY: next.y };
    });
  };

  const onFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      const img = new window.Image();
      img.onload = () => {
        setConfig({
          src,
          img,
          natW: img.naturalWidth,
          natH: img.naturalHeight,
          zoom: 1,
          offX: 0,
          offY: 0,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="plinth-fit">
      <div className="plinth-fit__stage">
        <div
          ref={containerRef}
          className={`plinth-crop plinth-crop--${size.shape}`}
          style={{ width: cw, height: ch }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {config.src ? (
            <img
              ref={imgElRef}
              src={config.src}
              alt="Uploaded artwork, drag to reposition"
              draggable={false}
              className="plinth-crop__img"
              style={{
                width: drawW,
                height: drawH,
                transform: `translate(-50%,-50%) translate(${config.offX}px, ${config.offY}px)`,
              }}
            />
          ) : (
            <label className="plinth-crop__empty">
              <ImagePlus size={22} strokeWidth={1.5} />
              <span>Upload a photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onFile(e.target.files?.[0])}
                hidden
              />
            </label>
          )}
        </div>
        <Label left={size.name} right={`${size.w} × ${size.h} CM`} />
      </div>

      <div className="plinth-fit__controls">
        <p className="plinth-eyebrow">Fit &amp; position</p>
        <p className="plinth-copy">
          Drag the photo to frame it, then use the slider to fill the{" "}
          {size.shape === "round" ? "circle" : "canvas"} exactly. Nothing is
          cropped until you confirm.
        </p>

        {config.src && (
          <>
            <label className="plinth-field">
              <span>Zoom</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={config.zoom}
                onChange={(e) => onZoom(parseFloat(e.target.value))}
              />
            </label>
            <div className="plinth-fit__buttons">
              <label className="plinth-btn plinth-btn--ghost">
                <Upload size={14} /> Replace photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFile(e.target.files?.[0])}
                  hidden
                />
              </label>
              <button
                type="button"
                className="plinth-btn plinth-btn--ghost"
                onClick={() =>
                  setConfig((c) => ({ ...c, zoom: 1, offX: 0, offY: 0 }))
                }
              >
                <RotateCcw size={14} /> Recenter
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/*  App                                                                     */
/* ----------------------------------------------------------------------- */

export default function App() {
  const [step, setStep] = useState(0);
  const [sizeId, setSizeId] = useState(SIZES[1].id);
  const [paintId, setPaintId] = useState(PAINTS[0].id);
  const [qty, setQty] = useState(1);
  const[readypainting,setReadyPainting]=useState("")
  const [imgConfig, setImgConfig] = useState({
    src: null,
    img: null,
    natW: 0,
    natH: 0,
    zoom: 1,
    offX: 0,
    offY: 0,
  });
  const [bakedSrc, setBakedSrc] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [view, setView] = useState("shop"); // shop | checkout | confirmed
  const [order, setOrder] = useState(null);
  const [shipping, setShipping] = useState({
    name: "",
    email: "",
    address: "",
    city: "",
    postal: "",
    country: "",
  });

  const imgElRef = useRef(null);
  const size = Emptyandready.find((s) => s.id === sizeId);
  const paint = PAINTS.find((p) => p.id === paintId);
  const unitPrice = priceFor(size, paint);

  useEffect(() => {
    setImgConfig({ src: null, img: null, natW: 0, natH: 0, zoom: 1, offX: 0, offY: 0 });
    setBakedSrc(null);
  }, [sizeId]);

  // Bake the exact crop (respecting pan + zoom) into a flat image any time
  // the source photo, its position/zoom, or the target canvas changes. This
  // uses the loaded Image object directly rather than a DOM ref, so it still
  // works once the step-2 crop stage has unmounted.
  useEffect(() => {
    if (!imgConfig.img || !imgConfig.natW) {
      setBakedSrc(null);
      return;
    }
    const { w: cw, h: ch } = cropDims(size);
    const renderW = 640;
    const renderH = Math.round(renderW * (ch / cw));
    const k = renderW / cw;
    const canvas = document.createElement("canvas");
    canvas.width = renderW;
    canvas.height = renderH;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, renderW, renderH);
    ctx.save();
    if (size.shape === "round") {
      ctx.beginPath();
      ctx.arc(renderW / 2, renderH / 2, renderW / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    const baseScale = Math.max(cw / imgConfig.natW, ch / imgConfig.natH);
    const scale = baseScale * imgConfig.zoom * k;
    const drawW = imgConfig.natW * scale;
    const drawH = imgConfig.natH * scale;
    const cx = renderW / 2 + imgConfig.offX * k;
    const cy = renderH / 2 + imgConfig.offY * k;
    ctx.drawImage(imgConfig.img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
    ctx.restore();
    setBakedSrc(canvas.toDataURL("image/jpeg", 0.92));
  }, [imgConfig.img, imgConfig.natW, imgConfig.natH, imgConfig.zoom, imgConfig.offX, imgConfig.offY, size]);

  const addToCart = () => {
    const thumb = bakedSrc;
    setCart((c) => [
      ...c,
      {
        cartId: `${sizeId}-${paintId}-${Date.now()}`,
        sizeId,
        sizeName: size.name,
        shape: size.shape,
        dims: `${size.w} × ${size.h} cm`,
        paintName: paint.name,
        unitPrice,
        qty,
        thumb,
      },
    ]);
    setCartOpen(true);
  };

  const startNewPiece = () => {
    setStep(1);
    setQty(1);
    setImgConfig({ src: null, img: null, natW: 0, natH: 0, zoom: 1, offX: 0, offY: 0 });
    setBakedSrc(null);
  };

  const removeFromCart = (id) =>
    setCart((c) => c.filter((i) => i.cartId !== id));

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const shippingFee = cart.length ? 12 : 0;
  const total = subtotal + shippingFee;

  const canContinueFrom = {
    1: !!sizeId,
    2: !!imgConfig.src,
    3: !!paintId,
  };

  const placeOrder = (e) => {
    e.preventDefault();
    setOrder({
      number: `PL-${Date.now().toString().slice(-6)}`,
      items: cart,
      total,
      shipping,
    });
    setCart([]);
    setView("confirmed");
    setCartOpen(false);
  };

  return (
    <div className="plinth-root">
      

      {/* Header */}
      <header className="plinth-header">
        <div onClick={()=>{setStep(0)}} className="plinth-wordmark">
          PLIN<span>TH</span>
        </div>
        <button className="plinth-cartbtn" onClick={() => setCartOpen(true)}>
          <ShoppingBag size={15} />
          Cart
          {cart.length > 0 && (
            <span className="plinth-cartbtn__count">{cart.length}</span>
          )}
        </button>
      </header>

      {view === "shop" && (
        <>
          


          {/* Step 1 — Size */}
          {step === 0 && (
            <div className="LandingPage">
              <div className="Existing">
                <p>Choose from Existing Paintings</p> 
                <img onClick={()=>setStep(5)} src="./Painting1.jpg" alt="ss" />
              </div>
              <div className="Create">
                 <p>Create your Own Painting</p>
              <div onClick={()=>setStep(1)} className="EmptyCanvas" > </div> </div>
              
            </div>
          )}
{step === 5 && (
            <section className="plinth-section">
              
              <h1 className="plinth-h1">Choose from Existing Paintings</h1>
              {/* <p className="plinth-copy">
                Choose from our existing Paintings ready for deliver      
              </p> */}
              <br />
              <hr />
              <br />
              <div className="plinth-gallery">
                {PAINTINGS.map((s) => {
                  const box = visualBox(s);
                  const selected = s.id === sizeId;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      className="plinth-piece"
                      data-selected={selected}
                      onClick={() => {setSizeId(s.id)
                      setReadyPainting(s.ImgSrc) 
                      
                      } 
                      }
                    >
                      <span className="plinth-piece__check">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className="plinth-piece__wall">
                        <img 
                        src={s.ImgSrc}
                          className={`plinth-piece__canvas plinth-piece__canvas--${s.shape}`}
                          style={{ width: box.w, height: box.h }}
                        />
                      </span>
                      <Label
                        left={s.name}
                        right={`+${priceFor(s, PAINTS[0])}Dzd`}
                      />
                    </button>
                  );
                })}
              </div>
              <span />
              <div className="plinth-nav">
                
                <button className="plinth-btn plinth-btn--ghost" onClick={() => setStep(0)}>
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  className="plinth-btn plinth-btn--primary"
                  disabled={!canContinueFrom[1]}
                  onClick={() => {
                    
                    setStep(6)}}
                >
                  Continue <ChevronRight size={14} />
                </button>
              </div>
            </section>
          )}
           {step === 6 && (
            
            <section className="plinth-section">
              <StepIndicator current={step} />
              <p className="plinth-eyebrow">Step Four</p>
              <h1 className="plinth-h1">Review your piece</h1>
              
              <div className="plinth-review">
<ReadyImageFitReview

                size={size}
                config={imgConfig}
                setConfig={setImgConfig}
                imgElRef={imgElRef}
                readypainting={readypainting}
                // readypainting={readypainting}
              />
                {/* <div>
                  <div
                    className={`plinth-review__canvas plinth-review__canvas--${size.shape}`}
                    style={(() => {
                      const box = cropDims(size);
                      const scale = Math.min(1, 300 / box.w);
                      return { width: box.w * scale, height: box.h * scale };
                    })()}
                  >
                    {(bakedSrc || imgConfig.src) && (
                      <img
                        src={bakedSrc || imgConfig.src}
                        alt="Final canvas preview"
                        
                      />
                    )}
                  </div>
                </div> */}
                <div>
                  <div className="plinth-review__specs">
                    <Label left="Size" right={`${size.w} × ${size.h} CM`} />
                    <Label left="Shape" right={size.shape === "round" ? "Round" : "Rectangle"} />
                    <Label left="Medium" right={paint.name} />
                    <Label left="Unit price" right={`${unitPrice} Dzd`} />
                  </div>

                  <div className="plinth-field" style={{ marginBottom: "1.4rem" }}>
                    <span>Quantity</span>
                    <div className="plinth-qty">
                      <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                        <Minus size={13} />
                      </button>
                      <span>{qty}</span>
                      <button type="button" onClick={() => setQty((q) => q + 1)}>
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <button className="plinth-btn plinth-btn--brass" onClick={addToCart}>
                    <ShoppingBag size={14} /> Add to cart — ${unitPrice * qty}
                  </button>
                </div>
              </div>
              <div className="plinth-nav">
                <button className="plinth-btn plinth-btn--ghost" onClick={() => setStep(5)}>
                  <ChevronLeft size={14} /> Back
                </button>
                <button className="plinth-btn plinth-btn--ghost" onClick={startNewPiece}>
                  Design another piece
                </button>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="plinth-section">
              <StepIndicator current={step} />
              <p className="plinth-eyebrow">Step One</p>
              <h1 className="plinth-h1">Choose your canvas</h1>
              <p className="plinth-copy">
                Every size is shown to scale against the others. Pick a
                rectangle or a round canvas — you'll fit your photo to it
                next.
              </p>
              <div className="plinth-gallery">
                {SIZES.map((s) => {
                  const box = visualBox(s);
                  const selected = s.id === sizeId;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      className="plinth-piece"
                      data-selected={selected}
                      onClick={() => setSizeId(s.id)}
                    >
                      <span className="plinth-piece__check">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <span className="plinth-piece__wall">
                        <span
                          className={`plinth-piece__canvas plinth-piece__canvas--${s.shape}`}
                          style={{ width: box.w, height: box.h }}
                        />
                      </span>
                      <Label
                        left={s.name}
                        right={`+${priceFor(s, PAINTS[0])}Dzd`}
                      />
                    </button>
                  );
                })}
              </div>
              <span />
              <div className="plinth-nav">
                
                <button className="plinth-btn plinth-btn--ghost" onClick={() => setStep(0)}>
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  className="plinth-btn plinth-btn--primary"
                  disabled={!canContinueFrom[1]}
                  onClick={() => setStep(2)}
                >
                  Continue <ChevronRight size={14} />
                </button>
              </div>
            </section>
          )}

          {/* Step 2 — Image fit */}
          {step === 2 && (
            <section className="plinth-section">
              <StepIndicator current={step} />
              <p className="plinth-eyebrow">Step Two</p>
              <h1 className="plinth-h1">Fit your photo</h1>
              <ImageFitStage
                size={size}
                config={imgConfig}
                setConfig={setImgConfig}
                imgElRef={imgElRef}
              />
              <div className="plinth-nav">
                <button className="plinth-btn plinth-btn--ghost" onClick={() => setStep(1)}>
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  className="plinth-btn plinth-btn--primary"
                  disabled={!canContinueFrom[2]}
                  onClick={() => setStep(3)}
                >
                  Continue <ChevronRight size={14} />
                </button>
              </div>
            </section>
          )}

          {/* Step 3 — Paint type */}
          {step === 3 && (
            <section className="plinth-section">
              <StepIndicator current={step} />
              <p className="plinth-eyebrow">Step Three</p>
              <h1 className="plinth-h1">Choose your medium</h1>
              <p className="plinth-copy">
                Price scales with size and medium. Archival print is the
                fastest and most affordable; oil is the most involved.
              </p>
              <div className="plinth-paints">
                {PAINTS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className="plinth-paint"
                    data-selected={p.id === paintId}
                    onClick={() => setPaintId(p.id)}
                  >
                    <PaintSwatch id={p.id} />
                    <span className="plinth-paint__name">{p.name}</span>
                    <span className="plinth-paint__desc">{p.desc}</span>
                    <span className="plinth-paint__price">
                      ${priceFor(size, p)} on {size.name.toLowerCase()}
                    </span>
                  </button>
                ))}
              </div>

              <div className="plinth-pricebar">
                <Label
                  size="lg"
                  left={`${size.name} · ${paint.name}`}
                  right=""
                />
                <span className="plinth-pricebar__total plinth-mono">
                  {unitPrice}Dzd
                </span>
              </div>

              <div className="plinth-nav">
                <button className="plinth-btn plinth-btn--ghost" onClick={() => setStep(2)}>
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  className="plinth-btn plinth-btn--primary"
                  disabled={!canContinueFrom[3]}
                  onClick={() => setStep(4)}
                >
                  Continue <ChevronRight size={14} />
                </button>
              </div>
            </section>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            
            <section className="plinth-section">
              <StepIndicator current={step} />
              <p className="plinth-eyebrow">Step Four</p>
              <h1 className="plinth-h1">Review your piece</h1>
              
              <div className="plinth-review">
<ImageFitReview

                size={size}
                config={imgConfig}
                setConfig={setImgConfig}
                imgElRef={imgElRef}
                readypainting={readypainting}
                // readypainting={readypainting}
              />
                {/* <div>
                  <div
                    className={`plinth-review__canvas plinth-review__canvas--${size.shape}`}
                    style={(() => {
                      const box = cropDims(size);
                      const scale = Math.min(1, 300 / box.w);
                      return { width: box.w * scale, height: box.h * scale };
                    })()}
                  >
                    {(bakedSrc || imgConfig.src) && (
                      <img
                        src={bakedSrc || imgConfig.src}
                        alt="Final canvas preview"
                        
                      />
                    )}
                  </div>
                </div> */}
                <div>
                  <div className="plinth-review__specs">
                    <Label left="Size" right={`${size.w} × ${size.h} CM`} />
                    <Label left="Shape" right={size.shape === "round" ? "Round" : "Rectangle"} />
                    <Label left="Medium" right={paint.name} />
                    <Label left="Unit price" right={`${unitPrice} Dzd`} />
                  </div>

                  <div className="plinth-field" style={{ marginBottom: "1.4rem" }}>
                    <span>Quantity</span>
                    <div className="plinth-qty">
                      <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                        <Minus size={13} />
                      </button>
                      <span>{qty}</span>
                      <button type="button" onClick={() => setQty((q) => q + 1)}>
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <button className="plinth-btn plinth-btn--brass" onClick={addToCart}>
                    <ShoppingBag size={14} /> Add to cart — ${unitPrice * qty}
                  </button>
                </div>
              </div>
              <div className="plinth-nav">
                <button className="plinth-btn plinth-btn--ghost" onClick={() => setStep(3)}>
                  <ChevronLeft size={14} /> Back
                </button>
                <button className="plinth-btn plinth-btn--ghost" onClick={startNewPiece}>
                  Design another piece
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {view === "checkout" && (
        <section className="plinth-section">
          <p className="plinth-eyebrow">Checkout</p>
          <h1 className="plinth-h1">Shipping details</h1>
          <form className="plinth-checkout" onSubmit={placeOrder}>
            <div className="plinth-form-row">
              <label>Full name</label>
              <input
                required
                value={shipping.name}
                onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="plinth-form-row">
              <label>Email</label>
              <input
                type="email"
                required
                value={shipping.email}
                onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))}
              />
            </div>
            <div className="plinth-form-row">
              <label>Address</label>
              <input
                required
                value={shipping.address}
                onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))}
              />
            </div>
            <div className="plinth-form-grid">
              <div className="plinth-form-row">
                <label>City</label>
                <input
                  required
                  value={shipping.city}
                  onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))}
                />
              </div>
              <div className="plinth-form-row">
                <label>Postal code</label>
                <input
                  required
                  value={shipping.postal}
                  onChange={(e) => setShipping((s) => ({ ...s, postal: e.target.value }))}
                />
              </div>
            </div>
            <div className="plinth-form-row">
              <label>Country</label>
              <input
                required
                value={shipping.country}
                onChange={(e) => setShipping((s) => ({ ...s, country: e.target.value }))}
              />
            </div>

            <div className="plinth-drawer__row" style={{ marginTop: "0.4rem" }}>
              <span>Subtotal</span>
              <span>${subtotal}</span>
            </div>
            <div className="plinth-drawer__row">
              <span>Shipping</span>
              <span>${shippingFee}</span>
            </div>
            <div className="plinth-drawer__row plinth-drawer__row--total">
              <span>Total</span>
              <span>${total}</span>
            </div>

            <div className="plinth-nav">
              <button
                type="button"
                className="plinth-btn plinth-btn--ghost"
                onClick={() => setView("shop")}
              >
                <ChevronLeft size={14} /> Back to shop
              </button>
              <button type="submit" className="plinth-btn plinth-btn--brass">
                Place order
              </button>
            </div>
          </form>
        </section>
      )}

      {view === "confirmed" && order && (
        <div className="plinth-confirm">
          <div className="plinth-confirm__mark">
            <Check size={20} strokeWidth={3} />
          </div>
          <h1 className="plinth-h1">Your order is in the studio</h1>
          <p className="plinth-copy" style={{ margin: "0 auto 1.4rem" }}>
            Order <strong className="plinth-mono">{order.number}</strong> for{" "}
            {order.shipping.name} — we'll email {order.shipping.email} when
            it ships. Total charged: <strong>${order.total}</strong>.
          </p>
          <button
            className="plinth-btn plinth-btn--primary"
            onClick={() => {
              setOrder(null);
              startNewPiece();
              setView("shop");
            }}
          >
            Start a new piece
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <>
          <div className="plinth-overlay" onClick={() => setCartOpen(false)} />
          <aside className="plinth-drawer">
            <div className="plinth-drawer__head">
              <span className="plinth-h1" style={{ fontSize: "1.2rem", margin: 0 }}>
                Your cart
              </span>
              <button
                className="plinth-cartitem__x"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                <X size={18} />
              </button>
            </div>
            <div className="plinth-drawer__body">
              {cart.length === 0 && (
                <p className="plinth-empty">
                  Nothing here yet — design a canvas to get started.
                </p>
              )}
              {cart.map((item) => (
                <div className="plinth-cartitem" key={item.cartId}>
                  {item.thumb && (
                    <img
                      src={item.thumb}
                      alt=""
                      className={`plinth-cartitem__thumb plinth-cartitem__thumb--${
                        item.shape === "round" ? "round" : ""
                      }`}
                    />
                  )}
                  <div className="plinth-cartitem__info">
                    <span className="plinth-cartitem__name">{item.sizeName}</span>
                    <span className="plinth-cartitem__meta">
                      {item.dims} · {item.paintName} · Qty {item.qty}
                    </span>
                    <span className="plinth-cartitem__price">
                      ${item.unitPrice * item.qty}
                    </span>
                  </div>
                  <button
                    className="plinth-cartitem__x"
                    onClick={() => removeFromCart(item.cartId)}
                    aria-label={`Remove ${item.sizeName}`}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="plinth-drawer__foot">
                <div className="plinth-drawer__row">
                  <span>Subtotal</span>
                  <span>${subtotal}</span>
                </div>
                <div className="plinth-drawer__row">
                  <span>Shipping</span>
                  <span>${shippingFee}</span>
                </div>
                <div className="plinth-drawer__row plinth-drawer__row--total">
                  <span>Total</span>
                  <span>${total}</span>
                </div>
                <button
                  className="plinth-btn plinth-btn--brass"
                  onClick={() => {
                    setCartOpen(false);
                    setView("checkout");
                  }}
                >
                  Checkout
                </button>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}