import { AssetStatus } from "@prisma/client";
import Link from "next/link";
import {
  getAssetDirectoryFilters,
  listAssets,
} from "@/modules/asset/queries/asset.queries";
import { assetDirectoryFilterSchema } from "@/modules/asset/validators/asset-directory.schema";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssetDirectoryPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const filters = assetDirectoryFilterSchema.parse({
    search: firstParam(params.search),
    status: firstParam(params.status),
    categoryId: firstParam(params.categoryId),
    location: firstParam(params.location),
    sortBy: firstParam(params.sortBy),
    sortDirection: firstParam(params.sortDirection),
  });

  const [assets, filterOptions] = await Promise.all([
    listAssets(filters),
    getAssetDirectoryFilters(),
  ]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Asset Manager</p>
          <h1 className="page-title">Asset Directory</h1>
          <p className="page-subtitle">
            View, search, and filter every registered asset.
          </p>
        </div>
        <nav className="nav-row">
          <Link className="button" href="/assets/new">
            Register asset
          </Link>
        </nav>
      </header>

      <form className="card form-grid" style={{ marginBottom: 18 }}>
        <label className="span-full">
          Search
          <input
            defaultValue={filters.search ?? ""}
            name="search"
            placeholder="Search by tag, name, or serial number"
          />
        </label>

        <label>
          Status
          <select defaultValue={filters.status ?? ""} name="status">
            <option value="">All statuses</option>
            {Object.values(AssetStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Category
          <select defaultValue={filters.categoryId ?? ""} name="categoryId">
            <option value="">All categories</option>
            {filterOptions.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Location
          <select defaultValue={filters.location ?? ""} name="location">
            <option value="">All locations</option>
            {filterOptions.locations.map((location) => (
              <option key={location ?? "unknown"} value={location ?? ""}>
                {location}
              </option>
            ))}
          </select>
        </label>

        <label>
          Sort by
          <select defaultValue={filters.sortBy} name="sortBy">
            <option value="assetTag">Asset Tag</option>
            <option value="name">Asset Name</option>
          </select>
        </label>

        <label>
          Direction
          <select defaultValue={filters.sortDirection} name="sortDirection">
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>

        <div className="actions-row span-full">
          <button type="submit">Apply filters</button>
          <Link className="button secondary" href="/assets">
            Clear
          </Link>
        </div>
      </form>

      <section className="card">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 className="card-title" style={{ margin: 0 }}>
              Registered Assets
            </h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {assets.length} {assets.length === 1 ? "asset" : "assets"} found
            </p>
          </div>
        </div>

        {assets.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No assets found.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Asset Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <Link href={`/assets/${asset.id}`}>{asset.assetTag}</Link>
                    </td>
                    <td>
                      <Link href={`/assets/${asset.id}`}>{asset.name}</Link>
                    </td>
                    <td>{asset.category.name}</td>
                    <td>
                      <span className="status-pill">{asset.status}</span>
                    </td>
                    <td>{asset.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
