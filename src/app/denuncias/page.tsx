import type { Metadata } from "next";
import { H2, LegalPage, V } from "@/components/LegalPage";
import { legalInfo } from "@/lib/legal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Denunciar conteúdo — PhotoShare" };

export default function ReportInfoPage() {
  const l = legalInfo();
  return (
    <LegalPage title="Denunciar conteúdo">
      <p>
        Se você encontrou um álbum com conteúdo ilegal ou que viola seus direitos, nos avise.
        Toda denúncia é analisada pela administração.
      </p>

      <H2>Como denunciar</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Pelo próprio álbum:</strong> no link público do álbum, use o botão
          “Denunciar” no fim da página.
        </li>
        <li>
          <strong>Por e-mail:</strong> escreva para <V v={l.abuseEmail} /> com o link do
          álbum e o motivo.
        </li>
      </ul>

      <H2>Nudez ou conteúdo íntimo sem consentimento</H2>
      <p>
        Se você aparece em fotos íntimas divulgadas sem a sua autorização, envie a denúncia
        informando o link do álbum e quais fotos são suas. Esses casos têm prioridade e o
        conteúdo é retirado do ar após a notificação, conforme o art. 21 do Marco Civil da
        Internet.
      </p>

      <H2>Crianças e adolescentes</H2>
      <p>
        Conteúdo que exponha crianças ou adolescentes de forma sexual ou abusiva é removido
        imediatamente e comunicado às autoridades. Você também pode denunciar diretamente à
        SaferNet (new.safernet.org.br/denuncie) ou pelo Disque 100.
      </p>
    </LegalPage>
  );
}
