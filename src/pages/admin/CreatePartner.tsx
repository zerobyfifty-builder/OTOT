import { useNavigate } from "react-router-dom";
import { CreatePartnerSheet } from "@/components/admin/partners/CreatePartnerSheet";

export default function CreatePartner() {
  const navigate = useNavigate();
  return (
    <CreatePartnerSheet
      open
      onOpenChange={(o) => { if (!o) navigate('/admin/partners'); }}
    />
  );
}
