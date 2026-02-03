let reviews = [];
let pipe = null;

async function init() {
  try {
    const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm');
    pipe = await pipeline('sentiment-analysis');
  } catch (e) {
    showStatus('AI failed to load', 'error');
  }
}

function showStatus(msg, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.style.color = type === 'error' ? 'red' : 'green';
  setTimeout(() => el.textContent = '', 3000);
}

function saveUrl() {
  const url = document.getElementById('gasUrl').value.trim();
  if (url && url.endsWith('/exec')) {
    localStorage.setItem('gasUrl', url);
    showStatus('URL saved!');
  } else {
    showStatus('URL must end with /exec', 'error');
  }
}

async function analyze() {
  if (!reviews.length) {
    await loadReviews();
  }
  if (!pipe) {
    await init();
  }
  if (!reviews.length || !pipe) return;

  const review = reviews[Math.floor(Math.random() * reviews.length)];
  document.getElementById('review').textContent = review;
  document.getElementById('review').style.display = 'block';

  try {
    const result = await pipe(review);
    const label = result[0].label.toUpperCase();
    const score = result[0].score;

    let emoji = '❓';
    if (label === 'POSITIVE') emoji = '👍';
    else if (label === 'NEGATIVE') emoji = '👎';

    document.getElementById('result').innerHTML = `${emoji} ${label} (${(score*100).toFixed(1)}%)`;
    document.getElementById('result').style.display = 'block';

    // Log to Google Sheets
    const gasUrl = localStorage.getItem('gasUrl');
    if (gasUrl) {
      const params = new URLSearchParams();
      params.append('review', review);
      params.append('sentiment', label);
      params.append('confidence', score.toString());
      fetch(gasUrl, { method: 'POST', body: params });
    }

    showStatus('Logged to Sheets!');
  } catch (e) {
    showStatus('Analysis failed', 'error');
  }
}

async function loadReviews() {
  try {
    const response = await fetch('reviews_test.tsv');
    const text = await response.text();
    Papa.parse(text, {
      header: true,
      delimiter: '\t',
      complete: (results) => {
        reviews = results.data.map(row => row.text).filter(t => t);
      }
    });
  } catch (e) {
    showStatus('Failed to load reviews', 'error');
  }
}

// Load saved URL
window.onload = () => {
  const saved = localStorage.getItem('gasUrl');
  if (saved) document.getElementById('gasUrl').value = saved;
};
