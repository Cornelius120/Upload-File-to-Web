const fetch = require("node-fetch");
const FormData = require("form-data");
const { parse } = require("aws-lambda-multipart-parser");

const FILEMOON_API_KEY = process.env.FILEMOON_API_KEY;

exports.handler = async (event) => {
  console.log("Fungsi 'upload' dipanggil.");

  if (!FILEMOON_API_KEY) {
    console.error(
      "FATAL: FILEMOON_API_KEY tidak diatur di Environment Variables."
    );
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Konfigurasi server tidak lengkap (API Key tidak ditemukan).",
      }),
    };
  }

  try {
    console.log("Mencoba mem-parsing data dari event...");
    const data = parse(event, true);

    // --- MATA-MATA (DEBUGGING LOG) ---
    // Kita akan mencetak seluruh data yang berhasil di-parse ke log
    // untuk melihat strukturnya dengan jelas.
    console.log("HASIL PARSING DATA:", JSON.stringify(data, null, 2));
    // --- AKHIR DARI MATA-MATA ---

    if (!data || !data.hosts) {
      // Jika 'hosts' tidak ada di dalam data, kita lempar error yang lebih jelas.
      throw new Error(
        "Parsing gagal: Properti 'hosts' tidak ditemukan dalam data yang diterima. Cek data yang dikirim dari frontend dan hasil parsing di atas."
      );
    }

    const selectedHosts = JSON.parse(data.hosts);

    let fileBuffer;
    let fileName;

    if (data.file) {
      console.log(`Menerima file dari form upload: ${data.file.filename}`);
      fileBuffer = data.file.content;
      fileName = data.file.filename;
    } else if (data.url) {
      console.log(`Menerima URL: ${data.url}. Mulai mengunduh...`);
      const remoteResponse = await fetch(data.url);
      if (!remoteResponse.ok) {
        throw new Error(
          `Gagal mengunduh file dari URL. Server merespon dengan status: ${remoteResponse.status}`
        );
      }
      const arrayBuffer = await remoteResponse.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileName =
        new URL(data.url).pathname.split("/").pop() || "remote-upload.tmp";
      console.log(
        `File dari URL berhasil diunduh. Nama: ${fileName}, Ukuran: ${fileBuffer.length} bytes.`
      );
    } else {
      throw new Error("Tidak ada file atau URL yang diberikan untuk diunggah.");
    }

    // --- PROSES UPLOAD FILEMOON (Tidak ada perubahan di sini) ---
    console.log("Meminta upload server dari Filemoon...");
    const serverResponse = await fetch(
      `https://api.filemoon.sx/api/upload/server?key=${FILEMOON_API_KEY}`
    );
    const serverData = await serverResponse.json();
    if (serverData.status !== 200) {
      throw new Error(`Filemoon API Error (get server): ${serverData.msg}`);
    }

    const uploadURL = serverData.result.upload_url;
    console.log("URL upload didapatkan. Memulai pengiriman file...");

    const uploadForm = new FormData();
    uploadForm.append("key", FILEMOON_API_KEY);
    uploadForm.append("file", fileBuffer, fileName);

    const uploadResponse = await fetch(uploadURL, {
      method: "POST",
      body: uploadForm,
    });
    const uploadResult = await uploadResponse.json();
    if (uploadResult.status !== 200) {
      throw new Error(`Filemoon API Error (upload file): ${uploadResult.msg}`);
    }

    const finalLink = uploadResult.result.files[0].url;
    console.log("Upload ke Filemoon berhasil! Link:", finalLink);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        links: [{ host: "Filemoon", url: finalLink }],
      }),
    };
  } catch (error) {
    console.error("Terjadi error di dalam fungsi 'upload':", error.message);
    // Kita juga tambahkan stack trace untuk info lebih detail
    console.error("Stack Trace:", error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: error.message }),
    };
  }
};
