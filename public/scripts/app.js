const fileInput = document.getElementById("file-input");
const fileNameDisplay = document.getElementById("file-name-display");

fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    fileNameDisplay.textContent = fileInput.files[0].name;
  } else {
    fileNameDisplay.textContent = "Klik untuk memilih file...";
  }
});

document
  .getElementById("upload-form")
  .addEventListener("submit", async function (event) {
    event.preventDefault();

    const urlInput = document.getElementById("url-input");
    const submitButton = document.getElementById("submit-button");
    const progressIndicator = document.getElementById("progress-indicator");
    const resultsArea = document.getElementById("results-area");
    const resultsList = document.getElementById("results-list");

    function showClientError(message) {
      resultsList.innerHTML = ""; // Hapus hasil lama
      const li = document.createElement("li");
      li.textContent = message;
      li.style.color = "#ff6b6b"; // Warna merah untuk error
      resultsList.appendChild(li);
      resultsArea.classList.remove("hidden");
      submitButton.disabled = false;
      progressIndicator.classList.add("hidden");
    }

    submitButton.disabled = true;
    progressIndicator.classList.remove("hidden");
    resultsArea.classList.add("hidden");
    resultsList.innerHTML = "";

    const selectedHosts = Array.from(
      document.querySelectorAll('input[name="hosts"]:checked')
    ).map((cb) => cb.value);

    if (selectedHosts.length === 0) {
      showClientError(
        "Kesalahan: Anda harus memilih setidaknya satu host tujuan."
      );
      return;
    }

    const formData = new FormData();
    if (fileInput.files.length > 0) {
      formData.append("file", fileInput.files[0]);
    } else if (urlInput.value) {
      formData.append("url", urlInput.value);
    } else {
      showClientError(
        "Kesalahan: Anda harus memilih file atau memasukkan URL."
      );
      return;
    }

    formData.append("hosts", JSON.stringify(selectedHosts));

    try {
      const response = await fetch("/.netlify/functions/upload", {
        method: "POST",
        body: formData,
      });

      const resultData = await response.json();
      if (!response.ok) {
        throw new Error(
          resultData.message ||
            `Terjadi error di server (Status: ${response.status})`
        );
      }

      if (resultData.success && resultData.links.length > 0) {
        resultData.links.forEach((link) => {
          const li = document.createElement("li");
          if (link.error) {
            li.innerHTML = `<strong>${link.host}:</strong> <span style="color: #ff6b6b;">Gagal - ${link.error}</span>`;
          } else {
            li.innerHTML = `<strong>${link.host}:</strong> <a href="${link.url}" target="_blank">${link.url}</a>`;
          }
          resultsList.appendChild(li);
        });
        resultsArea.classList.remove("hidden");
      } else {
        throw new Error(
          resultData.message || "Tidak ada link yang berhasil dibuat."
        );
      }
    } catch (error) {
      showClientError(`Error: ${error.message}`);
    } finally {
      submitButton.disabled = false;
      progressIndicator.classList.add("hidden");
    }
  });
