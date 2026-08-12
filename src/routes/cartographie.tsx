import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ByProjectView } from "@/components/cartographie/ByProjectView";
import { MatrixView } from "@/components/cartographie/MatrixView";
import { MindMapView } from "@/components/cartographie/MindMapView";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/cartographie")({
  head: () => ({
    meta: [
      { title: "Cartographie — Prospection RSE Amal Biladi" },
      {
        name: "description",
        content: "Carte visuelle des entreprises qualifiées pour chaque projet Amal Biladi.",
      },
    ],
  }),
  component: CartographiePage,
});

type View = "mindmap" | "byProject" | "matrix";

function CartographiePage() {
  const [view, setView] = useState<View>("mindmap");

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cartographie</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entreprises qualifiées par projet Amal Biladi — une entreprise liée à plusieurs
              projets apparaît une fois par projet.
            </p>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="mindmap">Mind map</TabsTrigger>
              <TabsTrigger value="byProject">Par projet</TabsTrigger>
              <TabsTrigger value="matrix">Matricielle</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {view === "mindmap" && <MindMapView />}
        {view === "byProject" && <ByProjectView />}
        {view === "matrix" && <MatrixView />}
      </div>
    </AppShell>
  );
}
