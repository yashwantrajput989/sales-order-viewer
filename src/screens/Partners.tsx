import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Cell, DataTable, Screen, Section } from "../components/ui";
import { matchesSearch, useScreenRows } from "../lib/api";

// Partners — list screen for Sales Order Header Partners (SalesOrderHeaderPartners via MyBTP AI)
export default function Partners() {
  const [searchParams] = useSearchParams();
  const params = useMemo(() => ({ "SalesOrder": searchParams.get("SalesOrder") || "" }), [searchParams]);
  const { rows, hasMore, loading, error, reload, loadMore } = useScreenRows("scr_8247ac9e54d6", params);
  const [search, setSearch] = useState("");
  const visibleRows = useMemo(() => rows.filter((row) => matchesSearch(row, search)), [rows, search]);

  return (
    <Screen title={"Partners"}>
      <Section title={"Main"}>
        <Cell span={12}><DataTable title={"Partners"} columns={[{ name: "PartnerFunction", label: "Partner Function", type: "string" }, { name: "Customer", label: "Customer", type: "string" }, { name: "Supplier", label: "Supplier", type: "string" }, { name: "ReferenceBusinessPartner", label: "Reference Business Partner", type: "string" }, { name: "ContactPerson", label: "Contact Person", type: "string" }]} card={{"title":"PartnerFunction","subtitle":["Customer","Supplier"],"badge":null,"meta":null}} rows={visibleRows} loading={loading} error={error} hasMore={hasMore} onLoadMore={loadMore} /></Cell>
      </Section>
    </Screen>
  );
}
