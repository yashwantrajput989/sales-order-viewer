import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Cell, DataTable, Screen, Section } from "../components/ui";
import { matchesSearch, useScreenRows } from "../lib/api";

// Deliveries & Invoices — list screen for Sales Order Subsequent Process Flows (SalesOrderSubsequentProcessFlows via MyBTP AI)
export default function DeliveriesInvoices() {
  const [searchParams] = useSearchParams();
  const params = useMemo(() => ({ "SalesOrder": searchParams.get("SalesOrder") || "" }), [searchParams]);
  const { rows, hasMore, loading, error, reload, loadMore } = useScreenRows("scr_776772f1d6db", params);
  const [search, setSearch] = useState("");
  const visibleRows = useMemo(() => rows.filter((row) => matchesSearch(row, search)), [rows, search]);

  return (
    <Screen title={"Deliveries & Invoices"}>
      <Section title={"Main"}>
        <Cell span={12}><DataTable title={"Deliveries & Invoices"} columns={[{ name: "SubsequentDocument", label: "Subsequent Document", type: "string" }, { name: "SubsequentDocumentCategory", label: "Subsequent Document Category", type: "string" }, { name: "OverallSDProcessStatus", label: "Overall SD Process Status", type: "string" }, { name: "CreationDate", label: "Creation Date", type: "date" }, { name: "CreationTime", label: "Creation Time", type: "string" }]} card={{"title":"SubsequentDocument","subtitle":["SubsequentDocumentCategory","CreationTime"],"badge":"OverallSDProcessStatus","meta":"CreationDate"}} rows={visibleRows} loading={loading} error={error} hasMore={hasMore} onLoadMore={loadMore} /></Cell>
      </Section>
    </Screen>
  );
}
