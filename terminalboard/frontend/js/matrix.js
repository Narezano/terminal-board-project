(() => {
  const canvas = document.getElementById("matrix");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Handle HiDPI
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  let w, h, columns, drops, fontSize;

  const CHARS = "アイウエオカキクケコｱｲｳｴｵｶｷｸｹｺ01";
  const charArray = CHARS.split("");

  // === NEW: global speed factor ===

  const SPEED = 0.2;
  function resize() {
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    w = Math.floor(canvas.clientWidth * dpr);
    h = Math.floor(canvas.clientHeight * dpr);
    canvas.width = w;
    canvas.height = h;

    fontSize = Math.max(12, Math.min(Math.floor(w / 90), 18)) * dpr;
    columns = Math.floor(w / fontSize);
    drops = Array(columns).fill(0);

    ctx.font = `${fontSize}px monospace`;
  }

  let frame = 0;
  function draw() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#00ff00";

    // Updates positions every Nth frame based on SPEED
    if (frame % Math.round(1 / SPEED) === 0) {
      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(text, x, y);

        if (y > h && Math.random() > 0.975) drops[i] = 0;
        else drops[i]++;
      }
    } else {
      // something something in the thing for the thing to do the thing...
      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(text, x, y);
      }
    }

    frame++;
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();
