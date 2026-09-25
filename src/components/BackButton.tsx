import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Revient à la page précédente de l'historique (pipeline, cartographie…), et
// à défaut — arrivée directe par lien — vers la page `fallbackTo`.
export function BackButton({
  fallbackTo = "/",
  label = "Retour",
}: {
  fallbackTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2"
      onClick={() => {
        if (router.history.canGoBack()) router.history.back();
        else void navigate({ to: fallbackTo });
      }}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
