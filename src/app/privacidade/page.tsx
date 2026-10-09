import type { Metadata } from "next";
import { H2, LegalPage, V } from "@/components/LegalPage";
import { legalInfo } from "@/lib/legal";
import { accessLogRetentionDays } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Política de Privacidade — PhotoShare" };

// MODELO — revisar com advogado antes de publicar.
export default function PrivacyPage() {
  const l = legalInfo();
  const months = Math.round(accessLogRetentionDays() / 30);
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta política explica como <V v={l.name} />
        {l.document && <> (CPF/CNPJ {l.document})</>}, com endereço em <V v={l.address} />,
        trata dados pessoais no PhotoShare, conforme a Lei Geral de Proteção de Dados
        (Lei 13.709/2018 — LGPD) e o Marco Civil da Internet (Lei 12.965/2014).
      </p>

      <H2>1. Quem é responsável pelos dados</H2>
      <p>
        <strong>Dados da sua conta</strong> (nome, e-mail, senha, registros de acesso):
        somos o <strong>controlador</strong>.
      </p>
      <p>
        <strong>Fotos enviadas pelos fotógrafos</strong> e as pessoas que nelas aparecem: o
        fotógrafo é o <strong>controlador</strong> — é ele quem decide o que enviar e com
        quem compartilhar — e nós somos o <strong>operador</strong>, armazenando e
        exibindo as fotos conforme as instruções dele. Pedidos sobre a sua imagem em um
        ensaio devem ser feitos primeiro ao fotógrafo; se não houver resposta, fale conosco
        pelo canal abaixo.
      </p>

      <H2>2. Quais dados tratamos e por quê</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Nome, e-mail e senha</strong> (a senha é guardada apenas como hash
          criptográfico): para criar e manter sua conta — execução de contrato (art. 7º, V).
        </li>
        <li>
          <strong>Fotos e informações dos álbuns</strong>: para prestar o serviço de
          armazenamento e compartilhamento contratado — execução de contrato (art. 7º, V).
        </li>
        <li>
          <strong>Endereço IP, data, hora e navegador</strong> de acessos: guarda obrigatória
          por {months} meses pelo art. 15 do Marco Civil da Internet — cumprimento de
          obrigação legal (art. 7º, II) — e também para segurança da conta, como detectar
          tentativas de invasão — legítimo interesse (art. 7º, IX).
        </li>
        <li>
          <strong>Data e versão do aceite</strong> destes termos: para comprovar o aceite.
        </li>
        <li>
          <strong>Denúncias</strong> (motivo, descrição, e-mail opcional e IP de quem
          denuncia): para analisar e remover conteúdo ilegal.
        </li>
      </ul>
      <p>
        Não vendemos dados, não usamos as fotos para treinar sistemas de inteligência
        artificial e não exibimos publicidade.
      </p>

      <H2>3. Cookies</H2>
      <p>
        Usamos apenas um cookie <strong>essencial</strong> (<code>ps_session</code>), que
        mantém você conectado por até 30 dias. Não usamos cookies de rastreamento ou de
        publicidade. Nas telas de login e cadastro, o serviço anti-robô Cloudflare
        Turnstile pode ser carregado para proteger sua conta.
      </p>

      <H2>4. Com quem compartilhamos</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Provedor de hospedagem e armazenamento onde o serviço roda;</li>
        <li>Provedor de envio de e-mails (confirmação de cadastro e redefinição de senha);</li>
        <li>Cloudflare (verificação anti-robô), que pode processar dados nos EUA;</li>
        <li>Autoridades, quando houver ordem judicial ou obrigação legal.</li>
      </ul>
      <p>
        Quando há transferência internacional de dados, ela segue o art. 33 da LGPD.
      </p>

      <H2>5. Por quanto tempo guardamos</H2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Conta e fotos: enquanto a conta existir. Ao excluir a conta, tudo é apagado.</li>
        <li>
          Registros de acesso: {months} meses, mesmo após a exclusão da conta, por exigência
          legal; depois são apagados automaticamente.
        </li>
        <li>Cópias de segurança (backups): até 14 dias após a exclusão.</li>
      </ul>

      <H2>6. Seus direitos (art. 18 da LGPD)</H2>
      <p>
        Você pode, a qualquer momento: confirmar se tratamos seus dados, acessá-los,
        corrigi-los, pedir portabilidade, pedir a eliminação e revogar consentimentos. Na
        área <strong>Minha conta</strong> você mesmo pode baixar todos os seus dados e fotos
        e excluir sua conta. Para os demais pedidos, escreva para <V v={l.privacyEmail} />.
        Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <H2>7. Segurança</H2>
      <p>
        Usamos conexão criptografada (HTTPS), senhas com hash bcrypt, bloqueio após
        tentativas de senha erradas, verificação anti-robô e cópias de segurança. Em caso
        de incidente de segurança que possa causar risco ou dano relevante, comunicaremos a
        ANPD e os titulares afetados, conforme a regulamentação.
      </p>

      <H2>8. Crianças e adolescentes</H2>
      <p>
        O serviço é destinado a maiores de 18 anos. Fotos de crianças e adolescentes só
        podem ser enviadas por fotógrafos que tenham autorização de pelo menos um dos pais
        ou responsável legal, no melhor interesse da criança (art. 14 da LGPD).
      </p>

      <H2>9. Encarregado e contato</H2>
      <p>
        Canal para assuntos de privacidade e proteção de dados: <V v={l.privacyEmail} />.
      </p>

      <H2>10. Alterações</H2>
      <p>
        Se esta política mudar de forma relevante, avisaremos na plataforma. A versão em
        vigor é sempre a publicada nesta página.
      </p>
    </LegalPage>
  );
}
