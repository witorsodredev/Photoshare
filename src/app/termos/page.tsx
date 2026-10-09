import type { Metadata } from "next";
import Link from "next/link";
import { H2, LegalPage, V } from "@/components/LegalPage";
import { legalInfo } from "@/lib/legal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Termos de Uso — PhotoShare" };

// MODELO — revisar com advogado antes de publicar.
export default function TermsPage() {
  const l = legalInfo();
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Estes termos regem o uso do PhotoShare, oferecido por <V v={l.name} />
        {l.document && <> (CPF/CNPJ {l.document})</>}, com endereço em <V v={l.address} />
        {" "}e contato pelo e-mail <V v={l.contactEmail} />. Ao criar uma conta, você
        declara ter lido e aceito estes termos e a{" "}
        <Link href="/privacidade" className="text-blue-400 hover:underline">
          Política de Privacidade
        </Link>
        .
      </p>

      <H2>1. O serviço</H2>
      <p>
        O PhotoShare permite que fotógrafos armazenem fotos em álbuns e compartilhem um link
        com seus clientes para visualização e download. As contas são liberadas após
        aprovação da administração, e cada conta tem um limite de armazenamento.
      </p>

      <H2>2. Cadastro</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>É preciso ter 18 anos ou mais e fornecer dados verdadeiros.</li>
        <li>
          A senha é pessoal. Você é responsável pelo que for feito com a sua conta e deve nos
          avisar se suspeitar de uso indevido.
        </li>
        <li>
          Após 5 tentativas de senha erradas seguidas, a conta é bloqueada por segurança e
          só a administração pode desbloqueá-la.
        </li>
      </ul>

      <H2>3. Suas responsabilidades sobre as fotos</H2>
      <p>Ao enviar fotos, você declara e garante que:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          é o autor das fotos ou tem autorização do autor (Lei 9.610/1998 — direitos
          autorais);
        </li>
        <li>
          tem autorização das pessoas retratadas para armazenar e compartilhar a imagem delas
          (art. 5º, X, da Constituição e art. 20 do Código Civil);
        </li>
        <li>
          no caso de crianças e adolescentes, tem autorização de pelo menos um dos pais ou
          responsável legal;
        </li>
        <li>
          é o controlador dos dados pessoais contidos nas fotos e cumpre a LGPD em relação aos
          seus clientes.
        </li>
      </ul>

      <H2>4. Conteúdo proibido</H2>
      <p>É proibido enviar ou compartilhar:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>nudez ou cenas íntimas sem o consentimento de quem aparece;</li>
        <li>
          qualquer conteúdo sexual envolvendo crianças ou adolescentes (crime — ECA, arts.
          240 e 241); esses casos são comunicados às autoridades;
        </li>
        <li>conteúdo que viole direitos autorais ou de imagem de terceiros;</li>
        <li>conteúdo violento, discriminatório, de ódio ou que configure crime;</li>
        <li>arquivos que não sejam fotos ou que contenham código malicioso.</li>
      </ul>

      <H2>5. Denúncias e remoção</H2>
      <p>
        Qualquer pessoa pode denunciar um álbum público pelo botão “Denunciar” ou pela{" "}
        <Link href="/denuncias" className="text-blue-400 hover:underline">
          página de denúncias
        </Link>
        . Conteúdo íntimo divulgado sem consentimento será retirado do ar após notificação
        da pessoa retratada ou de seu representante (art. 21 do Marco Civil da Internet). Nos
        demais casos, podemos retirar o conteúdo que viole estes termos ou cumprir ordem
        judicial (art. 19). O dono do álbum é avisado e pode contestar pelo e-mail de
        contato.
      </p>

      <H2>6. Suspensão e exclusão</H2>
      <p>
        Podemos suspender ou encerrar contas que violem estes termos. Você pode excluir sua
        conta a qualquer momento na área <strong>Minha conta</strong>; antes disso, baixe
        uma cópia das suas fotos, pois a exclusão é definitiva.
      </p>

      <H2>7. Disponibilidade e cópias de segurança</H2>
      <p>
        Fazemos cópias de segurança periódicas, mas o serviço não substitui o seu próprio
        arquivo dos originais. Podem ocorrer interrupções para manutenção ou por motivos
        fora do nosso controle.
      </p>

      <H2>8. Responsabilidade</H2>
      <p>
        Você responde pelo conteúdo que envia e compartilha. Nossa responsabilidade segue o
        Marco Civil da Internet e o Código de Defesa do Consumidor, quando aplicável.
      </p>

      <H2>9. Alterações</H2>
      <p>
        Podemos alterar estes termos. Mudanças relevantes serão avisadas na plataforma com
        antecedência razoável.
      </p>

      <H2>10. Lei e foro</H2>
      <p>
        Aplica-se a lei brasileira. Fica eleito o foro da comarca de <V v={l.city} />,
        ressalvado o direito do consumidor de propor ação no foro do seu domicílio.
      </p>
    </LegalPage>
  );
}
