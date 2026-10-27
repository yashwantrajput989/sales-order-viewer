import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Cell, DataTable, Screen, Section } from "../components/ui";
import { matchesSearch, paramsFrom, useScreenRows } from "../lib/api";

// Line Items — list screen for Items (Items via MyBTP AI)
export default function LineItems() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const params = useMemo(() => ({ "SalesOrder": searchParams.get("SalesOrder") || "" }), [searchParams]);
  const { rows, hasMore, loading, error, reload, loadMore } = useScreenRows("scr_0bcef104a5c9", params);
  const [search, setSearch] = useState("");
  const visibleRows = useMemo(() => rows.filter((row) => matchesSearch(row, search)), [rows, search]);

  return (
    <Screen title={"Line Items"}>
      <Section title={"Main"}>
        <Cell span={12}><DataTable title={"Line Items"} columns={[{ name: "SalesOrderItem", label: "Sales Order Item", type: "string" }, { name: "Material", label: "Material", type: "string" }, { name: "SalesOrderItemText", label: "Sales Order Item Text", type: "string" }, { name: "RequestedQuantity", label: "Requested Quantity", type: "number" }, { name: "RequestedQuantityUnit", label: "Requested Quantity Unit", type: "string" }, { name: "NetAmount", label: "Net Amount", type: "currency" }, { name: "TransactionCurrency", label: "Transaction Currency", type: "string" }, { name: "ProductionPlant", label: "Production Plant", type: "string" }, { name: "DeliveryStatus", label: "Delivery Status", type: "string" }]} card={{"title":"SalesOrderItem","subtitle":["Material","SalesOrderItemText"],"badge":"DeliveryStatus","meta":"NetAmount"}} rows={visibleRows} loading={loading} error={error} hasMore={hasMore} onLoadMore={loadMore} onRowClick={(row) => navigate("/delivery-schedule" + paramsFrom(row, ["SalesOrder","SalesOrderItem"]))} /></Cell>
      </Section>
    </Screen>
  );
}
