(function () {
        const input = document.getElementById("patchSearch");
        const items = Array.from(document.querySelectorAll(".patch-item"));
        const empty = document.getElementById("patchEmpty");
        if (!input || !items.length || !empty) return;

        function normalize(s) {
          return String(s || "").toLowerCase().trim();
        }

        function applyFilter() {
          const q = normalize(input.value);
          let visibleCount = 0;

          items.forEach((el) => {
            const text = normalize(el.textContent);
            const tags = normalize(el.getAttribute("data-tags"));
            const match = !q || text.includes(q) || tags.includes(q);

            el.hidden = !match;
            if (match) visibleCount++;
          });

          empty.hidden = visibleCount !== 0;
        }

        input.addEventListener("input", applyFilter);
      })();