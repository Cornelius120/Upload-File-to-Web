// --- Bagian Baru: Untuk menampilkan nama file yang dipilih ---
const fileInput = document.getElementById("file-input");
const fileNameDisplay = document.getElementById("file-name-display");

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    fileNameDisplay.textContent = fileInput.files[0].name;
  } else {
    fileNameDisplay.textContent = "Klik untuk memilih file...";
  }
});
// --- Akhir Bagian Baru ---

document
  .getElementById("upload-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    // const fileInput = document.getElementById('file-input'); // sudah dideklarasi di atas
    const urlInput = document.getElementById("url-input");
    const submitButton = document.getElementById("submit-button");
    const progressIndicator = document.getElementById("progress-indicator");
    const resultsArea = document.getElementById("results-area"); // Ganti ke results-area
    const resultsList = document.getElementById("results-list");

    // Tampilkan indikator loading dan nonaktifkan tombol
    submitButton.disabled = true;
    progressIndicator.classList.remove("hidden");
    resultsArea.classList.add("hidden"); // Sembunyikan hasil lama
    resultsList.innerHTML = ""; // Bersihkan hasil sebelumnya

    // Kumpulkan host yang dipilih
    const selectedHosts = Array.from(
      document.querySelectorAll('input[name="hosts"]:checked')
    ).map((cb) => cb.value);

    if (selectedHosts.length === 0) {
      alert("Pilih setidaknya satu host!");
      submitButton.disabled = false;
      progressIndicator.classList.add("hidden");
      return;
    }

    // Siapkan data untuk dikirim ke backend
    const formData = new FormData();
    if (fileInput.files.length > 0) {
      formData.append("file", fileInput.files[0]);
    } else if (urlInput.value) {
      formData.append("url", urlInput.value);
    } else {
      alert("Pilih file atau masukkan URL!");
      submitButton.disabled = false;
      progressIndicator.classList.add("hidden");
      return;
    }

    formData.append("hosts", JSON.stringify(selectedHosts));

    try {
      // Kirim data ke Netlify Function 'upload'
      const response = await fetch("/.netlify/functions/upload", {
        method: "POST",
        body: formData, // FormData akan otomatis mengatur header Content-Type
      });

      if (!response.ok) {
        // Tangani error dari server dengan lebih baik
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      const results = await response.json();

      // Tampilkan hasil
      if (results.success && results.links.length > 0) {
        results.links.forEach((link) => {
          const li = document.createElement("li");
          if (link.error) {
            li.innerHTML = `<strong>${link.host}:</strong> <span style="color: #ff6b6b;">Gagal - ${link.error}</span>`;
          } else {
            li.innerHTML = `<strong>${link.host}:</strong> <a href="${link.url}" target="_blank">${link.url}</a>`;
          }
          resultsList.appendChild(li);
        });
        resultsArea.classList.remove("hidden"); // Tampilkan area hasil
      } else {
        // Jika tidak ada link sukses, tampilkan pesan
        throw new Error(
          results.message || "Tidak ada link yang berhasil dibuat."
        );
      }
    } catch (error) {
      const li = document.createElement("li");
      li.textContent = `Error: ${error.message}`;
      li.style.color = "red";
      resultsList.appendChild(li);
      resultsArea.classList.remove("hidden"); // Tampilkan area hasil meskipun error
    } finally {
      // Sembunyikan loading dan aktifkan kembali tombol
      submitButton.disabled = false;
      progressIndicator.classList.add("hidden");
    }
  });
