let reviews = [];
let sentimentPipeline = null;
let gasUrl = localStorage.getItem('gas_url') || '';

document.addEventListener("DOMContentLoaded", () => {
  const analyzeBtn = document.getElementById("analyze-btn");
  const reviewText = document.getElementById("review-text");
  const sentimentResult = document.getElementById("sentiment-result");
  const loadingEl = document.getElementById("loading");
  const statusEl = document.getElementById("status");
  const gasUrlInput = document.getElementById("gas-url");
  const saveGasBtn = document.getElementById("save-gas");

  // Load saved GAS URL
  if (gasUrl) gasUrlInput.value = gasUrl;

  // Save GAS URL
  saveGasBtn.onclick = () => {
    const url = gasUrlInput.value.trim();
    if (url && url.endsWith('/exec')) {
      localStorage.setItem('gas_url', url);
      gasUrl = url;
      statusEl.textContent = 'Logger URL saved! ❤️';
      statusEl.className = 'status success';
      statusEl.style.display = 'block';
      setTimeout(() => statusEl.style.display = 'none', 3000);
    } else {
      statusEl.textContent = 'URL must end with /exec ❌';
      statusEl.className = 'status error';
      statusEl.style.display = 'block';
      setTimeout(() => statusEl.style.display = 'none', 3000);
    }
  };

  // Load reviews
  fetch("reviews_test.tsv")
    .then(r => r.ok ? r.text() : Promise.reject())
    .then(tsv => {
      Papa.parse(tsv, {
        header: true,
        delimiter: "\t",
        complete: r => {
          reviews = r.data.map(row => row.text).filter(t => t?.trim());
        }
      });
    });

  // Load AI model
  import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm')
    .then(({ pipeline }) => pipeline('sentiment-analysis'))
    .then(pipe => {
      sentimentPipeline = pipe;
      loadingEl.style.display = 'none';
    })
    .catch(e => {
      loadingEl.textContent = 'AI failed to load 😢';
      loadingEl.style.color = '#c62828';
    });

  // Analyze button
  analyzeBtn.onclick = async () => {
    statusEl.style.display = 'none';
    if (!reviews.length) {
      statusEl.textContent = 'No reviews loaded ❌';
      statusEl.className = 'status error';
      statusEl.style.display = 'block';
      return;
    }
    if (!sentimentPipeline) {
      statusEl.textContent = 'AI is loading... wait ❤️';
      statusEl.className = 'status error';
      statusEl.style.display = 'block';
      return;
    }

    const review = reviews[Math.floor(Math.random() * reviews.length)];
    reviewText.textContent = `"${review}"`;
    reviewText.style.display = 'block';
    sentimentResult.style.display = 'none';
    analyzeBtn.disabled = true;

    try {
      const result = await sentimentPipeline(review);
      const label = result[0].label.toUpperCase();
      const score = result[0].score;

      let icon = "fa-question-circle", color = "#5d4037";
      if (label === "POSITIVE") { icon = "fa-thumbs-up"; color = "#2e7d32"; }
      else if (label === "NEGATIVE") { icon = "fa-thumbs-down"; color = "#c62828"; }

      sentimentResult.innerHTML = `<i class="fas ${icon}" style="color:${color}; margin-right:10px;"></i> ${label} (${(score*100).toFixed(1)}%)`;
      sentimentResult.style.display = 'block';

      // Log to Google Sheets
      if (gasUrl) {
        const params = new URLSearchParams();
        params.append('review', review);
        params.append('sentiment', label);
        params.append('confidence', score.toString());
        fetch(gasUrl, { method: 'POST', body: params }).catch(() => {});
      }

      statusEl.textContent = 'Mood checked! Logged to Sheets ❤️';
      statusEl.className = 'status success';
      statusEl.style.display = 'block';
      setTimeout(() => statusEl.style.display = 'none', 3000);
    } catch (e) {
      statusEl.textContent = 'Analysis failed ❌';
      statusEl.className = 'status error';
      statusEl.style.display = 'block';
      setTimeout(() => statusEl.style.display = 'none', 3000);
    } finally {
      analyzeBtn.disabled = false;
    }
  };
});
