import Link from "next/link";
import { notFound } from "next/navigation";
import { getAssetDetail } from "@/modules/asset/queries/asset.queries";

type PageParams = {
  assetId: string;
};

function formatCurrency(value: { toString(): string }) {
  return Number(value.toString()).toLocaleString("en-US", {
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
  const asset = await getAssetDetail({ assetId });

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

      <section className="card">
        <div className="grid two">
          <Detail label="Asset Tag" value={asset.assetTag} />
          <Detail label="Name" value={asset.name} />
          <Detail
            label="Category"
            value={asset.category.name}
          />
          <Detail label="Serial Number" value={asset.serialNumber} />
          <Detail
            label="Acquisition Date"
            value={
              asset.acquisitionDate
                ? asset.acquisitionDate.toLocaleDateString()
                : "Not provided"
            }
          />
          <Detail label="Acquisition Cost" value={`$${formatCurrency(asset.acquisitionCost)}`} />
          <Detail label="Location" value={asset.location ?? "Not provided"} />
          <Detail label="Status" value={asset.status} />
          <Detail label="Bookable" value={asset.isBookable ? "Yes" : "No"} />
          {asset.imageUrl ? (
            <Detail
              label="Image URL"
              value={
                <a href={asset.imageUrl} rel="noreferrer" target="_blank">
                  {asset.imageUrl}
                </a>
              }
            />
          ) : (
            <Detail label="Image URL" value="Not provided" />
          )}
        </div>
      </section>
    </main>
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
