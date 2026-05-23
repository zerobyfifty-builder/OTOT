import { useNavigate } from "react-router-dom";
import { CreateOwnerSheet } from "@/components/admin/owners/CreateOwnerSheet";

export default function CreateOwner() {
  const navigate = useNavigate();
  return (
    <CreateOwnerSheet
      open
      onOpenChange={(o) => { if (!o) navigate('/admin/owners'); }}
    />
  );
}
