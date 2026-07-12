import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetQRCode } from "@/components/AssetQRCode";
import { getAssetDetail } from "@/modules/asset/queries/asset.queries";
import { listAssetTimeline } from "@/modules/activity/queries/activity.queries";
import { formatDate, formatDateTime } from "@/shared/format/date";

type PageParams = {
  assetId: string;
};

function formatCurrency(value: { toString(): string }) {
  return Number(value.toString()).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export default async function AssetDetailsPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { assetId } = await params;
  const [asset, timeline] = await Promise.all([
    getAssetDetail({ assetId }),
    listAssetTimeline(assetId),
  ]);

  if (!asset) {
    notFound();
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Asset Details</p>
          <h1 className="page-title">
            {asset.assetTag} - {asset.name}
          </h1>
          <p className="page-subtitle">
            {asset.category.name} - {asset.location}
          </p>
        </div>
        <nav className="nav-row">
          <Link className="button secondary" href="/assets">
            Back to directory
          </Link>
        </nav>
      </header>

      <section className="grid two" style={{ marginBottom: 18 }}>
        <section className="card">
          <div className="grid two">
            <Detail label="Asset Tag" value={asset.assetTag} />
            <Detail label="Name" value={asset.name} />
            <Detail label="Category" value={asset.category.name} />
            <Detail label="Serial Number" value={asset.serialNumber} />
            <Detail
              label="Acquisition Date"
              value={
                asset.acquisitionDate
                  ? formatDate(asset.acquisitionDate)
                  : "Not provided"
              }
            />
            <Detail
              label="Acquisition Cost"
              value={`$${formatCurrency(asset.acquisitionCost)}`}
            />
            <Detail label="Location" value={asset.location ?? "Not provided"} />
            <Detail label="Status" value={asset.status} />
          <Detail label="Bookable" value={asset.isBookable ? "Yes" : "No"} />
          <AssetMedia imageUrl={asset.imageUrl} />
        </div>
      </section>

        <section className="card">
          <h2 className="card-title">Asset QR Code</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Scan to look up this asset by tag during audits or field checks.
          </p>
          <AssetQRCode assetTag={asset.assetTag} />
        </section>
      </section>

      <section className="card">
        <h2 className="card-title">Asset Timeline</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Registered, allocated, transferred, returned, maintenance, and audit events.
        </p>
        {timeline.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No timeline events yet.</p>
        ) : (
          <div className="list">
            {timeline.map((event) => (
              <article className="list-item" key={event.id}>
                <strong>{event.label}</strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {event.entityType} · {event.actor} ·{" "}
                  {formatDateTime(event.at)}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function AssetMedia({ imageUrl }: { imageUrl: string | null }) {
  if (!imageUrl) {
    return <Detail label="Photo / document" value="Not provided" />;
  }

  const isPdf = imageUrl.toLowerCase().endsWith(".pdf");

  return (
    <div className="list-item span-full" style={{ gridColumn: "1 / -1" }}>
      <p className="muted" style={{ margin: "0 0 6px" }}>
        Photo / document
      </p>
      {isPdf ? (
        <a href={imageUrl} rel="noreferrer" target="_blank">
          View PDF document
        </a>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="Asset" className="asset-photo" src={imageUrl} />
      )}
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="list-item">
      <p className="muted" style={{ margin: "0 0 6px" }}>
        {label}
      </p>
      <strong>{value}</strong>
    </div>
  );
}
