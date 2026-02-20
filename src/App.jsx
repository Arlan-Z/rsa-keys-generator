import { useEffect, useMemo, useRef, useState } from "react";

const KEY_SIZES = [2048, 3072, 4096];

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function toPem(base64, label) {
  const wrapped = base64.match(/.{1,64}/g)?.join("\n") ?? base64;
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----`;
}

function toOneLine(pem) {
  return pem.replace(/\r?\n/g, "\\n");
}

function fromOneLine(oneLinePem) {
  return oneLinePem.replace(/\\n/g, "\n");
}

export default function App() {
  const [keySize, setKeySize] = useState(2048);
  const [isGenerating, setIsGenerating] = useState(false);
  const [publicKeyOneLine, setPublicKeyOneLine] = useState("");
  const [privateKeyOneLine, setPrivateKeyOneLine] = useState("");
  const [toastText, setToastText] = useState("");
  const [errorText, setErrorText] = useState("");
  const toastTimeoutRef = useRef(null);

  const combined = useMemo(() => {
    if (!publicKeyOneLine || !privateKeyOneLine) return "";
    return `PUBLIC_KEY=${publicKeyOneLine}\n\nPRIVATE_KEY=${privateKeyOneLine}`;
  }, [publicKeyOneLine, privateKeyOneLine]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (text) => {
    setToastText(text);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToastText(""), 2000);
  };

  const generateRsaKeys = async () => {
    if (!window.crypto?.subtle) {
      setErrorText(
        "Web Crypto API is not available in this browser. Please open the site in a modern Chrome/Edge/Firefox browser."
      );
      return;
    }

    setErrorText("");
    setIsGenerating(true);

    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: Number(keySize),
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      );

      const exportedPublic = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
      const exportedPrivate = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

      const publicPem = toPem(arrayBufferToBase64(exportedPublic), "PUBLIC KEY");
      const privatePem = toPem(arrayBufferToBase64(exportedPrivate), "PRIVATE KEY");

      setPublicKeyOneLine(toOneLine(publicPem));
      setPrivateKeyOneLine(toOneLine(privatePem));
      showToast("Keys generated successfully");
    } catch (error) {
      setErrorText("Failed to generate keys. Please try again.");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyText = async (text, successMessage) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      setErrorText("Failed to copy to clipboard.");
    }
  };

  return (
    <div className="page">
      <div className="mesh mesh-a" />
      <div className="mesh mesh-b" />

      <main className="card">
        <header className="hero">
          <p className="eyebrow">RSA Key Generator</p>
          <h1>Generate RSA keys in one line</h1>
          <p className="subtitle">
            Output format: one-line PEM with <code>\n</code> separators, ready for use in `.env`,
            JSON, and API payloads.
          </p>
          <p className="notice">
            Security note: demo/testing only. Do not use generated keys in production.
          </p>
        </header>

        <section className="controls">
          <label htmlFor="key-size">Key size</label>
          <select
            id="key-size"
            value={keySize}
            onChange={(event) => setKeySize(event.target.value)}
            disabled={isGenerating}
          >
            {KEY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} bit
              </option>
            ))}
          </select>

          <button onClick={generateRsaKeys} disabled={isGenerating} className="primary">
            {isGenerating ? "Generating..." : "Generate keys"}
          </button>

          <button
            onClick={() => copyText(combined, "Both keys copied")}
            disabled={!combined || isGenerating}
            className="ghost"
          >
            Copy both
          </button>
        </section>

        {errorText ? <div className="alert">{errorText}</div> : null}

        <section className="keys-grid">
          <article className="key-block">
            <div className="block-head">
              <h2>Public Key (one-line)</h2>
              <button
                className="copy"
                disabled={!publicKeyOneLine || isGenerating}
                onClick={() => copyText(publicKeyOneLine, "Public key copied")}
              >
                Copy
              </button>
            </div>
            <textarea
              readOnly
              value={publicKeyOneLine}
              placeholder="Click “Generate keys” first"
            />
            <details>
              <summary>Show PEM with line breaks</summary>
              <pre>{publicKeyOneLine ? fromOneLine(publicKeyOneLine) : ""}</pre>
            </details>
          </article>

          <article className="key-block">
            <div className="block-head">
              <h2>Private Key (one-line)</h2>
              <button
                className="copy"
                disabled={!privateKeyOneLine || isGenerating}
                onClick={() => copyText(privateKeyOneLine, "Private key copied")}
              >
                Copy
              </button>
            </div>
            <textarea
              readOnly
              value={privateKeyOneLine}
              placeholder="Click “Generate keys” first"
            />
            <details>
              <summary>Show PEM with line breaks</summary>
              <pre>{privateKeyOneLine ? fromOneLine(privateKeyOneLine) : ""}</pre>
            </details>
          </article>
        </section>
      </main>

      <div className={`toast ${toastText ? "show" : ""}`}>{toastText}</div>
    </div>
  );
}
