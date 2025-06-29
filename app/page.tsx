'use client';

import { useState } from 'react';

export default function UploadPage() {
  const [csvUrl, setCsvUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('processed.csv');

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const res = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="(.+)"/);
      const name = match?.[1] ?? 'processed.csv';

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setCsvUrl(url);
      setFilename(name);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Upload Excel File</h1>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          name="file"
          accept=".xlsx"
          required
          className="mb-4"
        />
        <br />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Upload & Convert
        </button>
      </form>

      {csvUrl && (
        <div className="mt-6">
          <a
            href={csvUrl}
            download={filename}
            className="text-blue-700 underline"
          >
            Download {filename}
          </a>
        </div>
      )}
    </div>
  );
}
