import { useState } from "react";

interface DimRow {
  id: number;
  l: string;
  w: string;
  h: string;
  wt: string;
}

interface EmailData {
  openingLine: string;
  total: number;
  unitType: string;
  unitPlural: string;
  dims: DimRow[];
  storageText: string;
  airline: string;
  fromLines: string;
  toLines: string;
}

const DEFAULT_FROM = `Zeymos Pharma Ltd.
19 Park Royal Metro Centre
Britannia Way
London
NW10 7PA`;

const DEFAULT_TO = `Atheer Pharma
Al Khalidiyyah, Al Janubiyyah
Dammam 32221
SAUDI ARABIA
Contact: Mr. Hany Abdulqader
p: +966 138141386
HANY@NATUREZONE.ME`;

const AIRLINES = [
  "Saudi Airlines (Direct)",
  "Emirates (Direct)",
  "Qatar Airways (Direct)",
  "British Airways (Direct)",
  "Turkish Airlines (Via Istanbul)",
  "Lufthansa (Via Frankfurt)",
  "KLM (Via Amsterdam)",
  "Other",
];

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function LogicallView() {
  const [collectionDay, setCollectionDay] = useState("Friday");
  const [flightDay, setFlightDay] = useState("Saturday");
  const [airline, setAirline] = useState("Saudi Airlines (Direct)");
  const [requestType, setRequestType] = useState<"book" | "quote">("book");
  const [unitType, setUnitType] = useState<"Box" | "Pallet">("Box");
  const [storage, setStorage] = useState<"ambient" | "cold">("ambient");
  const [fromAddress, setFromAddress] = useState(DEFAULT_FROM);
  const [toAddress, setToAddress] = useState(DEFAULT_TO);
  const [dimRows, setDimRows] = useState<DimRow[]>([
    { id: 1, l: "27", w: "43", h: "24", wt: "10" },
    { id: 2, l: "27", w: "43", h: "24", wt: "16" },
  ]);
  const [nextId, setNextId] = useState(3);
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [copied, setCopied] = useState(false);

  function updateDimRow(
    id: number,
    field: keyof Omit<DimRow, "id">,
    value: string,
  ) {
    setDimRows((rows) =>
      rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  }

  function addDimRow() {
    setDimRows((rows) => [
      ...rows,
      { id: nextId, l: "", w: "", h: "", wt: "" },
    ]);
    setNextId((n) => n + 1);
  }

  function removeDimRow(id: number) {
    setDimRows((rows) => rows.filter((r) => r.id !== id));
  }

  function generateEmail() {
    const total = dimRows.length;
    const unitLower = unitType.toLowerCase();
    const unitPlural =
      total === 1 ? unitLower : unitLower === "box" ? "boxes" : unitLower + "s";
    const openingLine =
      requestType === "book"
        ? `Can you please book this shipment on ${flightDay}'s flight for collection on ${collectionDay} and provide me with the quoted price?`
        : `Can you please quote me for this shipment on ${flightDay}'s flight for collection on ${collectionDay}?`;
    const storageText =
      storage === "ambient"
        ? "Harmless pharmaceuticals store and transport at 15-25°C (not temperature-controlled collection, no curtain-sided vehicle)"
        : "Temperature-sensitive pharmaceuticals, cold chain 2-8°C – temperature-controlled vehicle required";
    setEmailData({
      openingLine,
      total,
      unitType,
      unitPlural,
      dims: dimRows,
      storageText,
      airline,
      fromLines: fromAddress.trim(),
      toLines: toAddress.trim(),
    });
  }

  function buildPlainText(d: EmailData) {
    let table = `${d.unitType}\tDims\tWeight\n`;
    d.dims.forEach((r, i) => {
      table += `${i + 1}\t${r.l}cm X ${r.w}cm X ${r.h}cm\t${r.wt}kg\n`;
    });
    return `Hi Jake,\n\n${d.openingLine}\n\nSee below the estimated dimensions and weight:\nTotal ${d.total} ${d.unitPlural}:\n\n${table}\nInstructions:\n${d.storageText}\nAirlines: ${d.airline}\nFrom:\n${d.fromLines}\nTo:\n${d.toLines}`;
  }

  function buildHtmlEmail(d: EmailData) {
    let tbl = `<table style="border-collapse:collapse;font-family:monospace;font-size:13px;margin:8px 0;"><thead><tr>`;
    ["#", "Dims", "Weight"].map((h) => {
      tbl += `<th style="border:1px solid #e2ddd7;padding:5px 14px;text-align:left;background:#f5f2ec;font-size:10px;text-transform:uppercase;color:#7a7570;">${h}</th>`;
    });
    tbl += `</tr></thead><tbody>`;
    d.dims.forEach((r, i) => {
      const bg = i % 2 === 0 ? "#fff" : "#faf8f5";
      tbl += `<tr><td style="border:1px solid #e2ddd7;padding:5px 14px;background:${bg};">${i + 1}</td><td style="border:1px solid #e2ddd7;padding:5px 14px;background:${bg};">${r.l}cm × ${r.w}cm × ${r.h}cm</td><td style="border:1px solid #e2ddd7;padding:5px 14px;background:${bg};">${r.wt}kg</td></tr>`;
    });
    tbl += `</tbody></table>`;
    return `<div style="font-family:monospace;font-size:13px;line-height:1.7;"><p style="white-space:pre-wrap;margin:0 0 8px">Hi Jake,\n\n${d.openingLine}\n\nSee below the estimated dimensions and weight:\nTotal ${d.total} ${d.unitPlural}:</p>${tbl}<p style="white-space:pre-wrap;margin:0">Instructions:\n${d.storageText}\nAirlines: ${d.airline}\nFrom:\n${d.fromLines}\nTo:\n${d.toLines}</p></div>`;
  }

  async function handleCopy() {
    if (!emailData) return;
    const plain = buildPlainText(emailData);
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([buildHtmlEmail(emailData)], {
              type: "text/html",
            }),
            "text/plain": new Blob([plain], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
    } catch {
      await navigator.clipboard.writeText(plain);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="logicall-view active">
      <div className="view-header">
        <p className="view-tag purple">Logistics</p>
        <h1>
          Logicall <em className="purple">booking</em>
        </h1>
        <p className="invoice-num" style={{ marginBottom: 0 }}>
          Fill in the details to generate a booking email for Jake.
        </p>
      </div>

      <div className="logicall-layout">
        {/* ── Form ── */}
        <div className="logicall-left">
          {/* 01 Shipment details */}
          <div className="booking-form-card">
            <div className="booking-section-header">
              <span className="booking-section-num">01</span>
              <span className="booking-section-title">Shipment details</span>
            </div>
            <div className="booking-section-body">
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Collection day</label>
                  <select
                    className="form-select"
                    value={collectionDay}
                    onChange={(e) => setCollectionDay(e.target.value)}
                  >
                    {DAYS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Flight day</label>
                  <select
                    className="form-select"
                    value={flightDay}
                    onChange={(e) => setFlightDay(e.target.value)}
                  >
                    {DAYS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Airlines</label>
                  <select
                    className="form-select"
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                  >
                    {AIRLINES.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Request type</label>
                  <div className="storage-toggle">
                    <button
                      className={`storage-btn book${requestType === "book" ? " active" : ""}`}
                      onClick={() => setRequestType("book")}
                    >
                      📦 Book
                      <br />
                      <span style={{ fontSize: 9, opacity: 0.7 }}>
                        Confirm shipment
                      </span>
                    </button>
                    <button
                      className={`storage-btn quote${requestType === "quote" ? " active" : ""}`}
                      onClick={() => setRequestType("quote")}
                    >
                      💬 Quote
                      <br />
                      <span style={{ fontSize: 9, opacity: 0.7 }}>
                        Price only
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Pallet or Box</label>
                  <select
                    className="form-select"
                    value={unitType}
                    onChange={(e) =>
                      setUnitType(e.target.value as "Box" | "Pallet")
                    }
                  >
                    <option>Box</option>
                    <option>Pallet</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Storage requirement</label>
                  <div className="storage-toggle">
                    <button
                      className={`storage-btn ambient${storage === "ambient" ? " active" : ""}`}
                      onClick={() => setStorage("ambient")}
                    >
                      🌡️ Ambient
                      <br />
                      <span style={{ fontSize: 9, opacity: 0.7 }}>15–25°C</span>
                    </button>
                    <button
                      className={`storage-btn cold${storage === "cold" ? " active" : ""}`}
                      onClick={() => setStorage("cold")}
                    >
                      ❄️ Cold chain
                      <br />
                      <span style={{ fontSize: 9, opacity: 0.7 }}>2–8°C</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 02 Dimensions */}
          <div className="booking-form-card">
            <div className="booking-section-header">
              <span className="booking-section-num">02</span>
              <span className="booking-section-title">
                Dimensions &amp; weights
              </span>
            </div>
            <div className="booking-section-body">
              <table className="dims-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Length</th>
                    <th>Width</th>
                    <th>Height</th>
                    <th>Weight</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {dimRows.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="dims-row-num">
                        {unitType} {idx + 1}
                      </td>
                      <td>
                        <input
                          className="dim-input"
                          style={{ width: 60 }}
                          value={row.l}
                          placeholder="27"
                          onChange={(e) =>
                            updateDimRow(row.id, "l", e.target.value)
                          }
                        />
                        <span className="dim-unit">cm</span>
                      </td>
                      <td>
                        <input
                          className="dim-input"
                          style={{ width: 60 }}
                          value={row.w}
                          placeholder="43"
                          onChange={(e) =>
                            updateDimRow(row.id, "w", e.target.value)
                          }
                        />
                        <span className="dim-unit">cm</span>
                      </td>
                      <td>
                        <input
                          className="dim-input"
                          style={{ width: 60 }}
                          value={row.h}
                          placeholder="24"
                          onChange={(e) =>
                            updateDimRow(row.id, "h", e.target.value)
                          }
                        />
                        <span className="dim-unit">cm</span>
                      </td>
                      <td>
                        <input
                          className="dim-input"
                          style={{ width: 55 }}
                          value={row.wt}
                          placeholder="10"
                          onChange={(e) =>
                            updateDimRow(row.id, "wt", e.target.value)
                          }
                        />
                        <span className="dim-unit">kg</span>
                      </td>
                      <td>
                        <button
                          className="dim-delete-btn"
                          onClick={() => removeDimRow(row.id)}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="add-dim-btn" onClick={addDimRow}>
                + Add row
              </button>
            </div>
          </div>

          {/* 03 From */}
          <div className="booking-form-card">
            <div className="booking-section-header">
              <span className="booking-section-num">03</span>
              <span className="booking-section-title">From address</span>
            </div>
            <div className="booking-section-body">
              <div className="form-row">
                <div className="form-field">
                  <textarea
                    className="form-textarea"
                    rows={5}
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 04 To */}
          <div className="booking-form-card">
            <div className="booking-section-header">
              <span className="booking-section-num">04</span>
              <span className="booking-section-title">To address</span>
            </div>
            <div className="booking-section-body">
              <div className="form-row">
                <div className="form-field">
                  <textarea
                    className="form-textarea"
                    rows={7}
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <button className="generate-btn" onClick={generateEmail}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 7h12M8 3l5 4-5 4"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Generate email
          </button>
        </div>

        {/* ── Email preview ── */}
        <div className="email-panel">
          <div className="email-panel-header">
            <div className="email-panel-title">
              Email <em>preview</em>
            </div>
            <button
              className={`copy-btn${copied ? " copied" : ""}`}
              onClick={handleCopy}
              disabled={!emailData}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="email-panel-body">
            {!emailData ? (
              <div className="email-empty">
                Fill in the form and click
                <br />
                "Generate email" to preview
                <br />
                your booking request.
              </div>
            ) : (
              <>
                <div className="email-subject-row">
                  <span className="email-subject-label">To</span>
                  <span className="email-subject-val">Jake @ Logicall</span>
                </div>
                <div className="email-preview">{`Hi Jake,\n\n${emailData.openingLine}\n\nSee below the estimated dimensions and weight:\nTotal ${emailData.total} ${emailData.unitPlural}:`}</div>
                <table className="email-dims-table">
                  <thead>
                    <tr>
                      <th>{emailData.unitType}</th>
                      <th>Dims</th>
                      <th>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailData.dims.map((d, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          {d.l}cm × {d.w}cm × {d.h}cm
                        </td>
                        <td>{d.wt}kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="email-preview">{`Instructions:\n${emailData.storageText}\nAirlines: ${emailData.airline}\nFrom:\n${emailData.fromLines}\nTo:\n${emailData.toLines}`}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
