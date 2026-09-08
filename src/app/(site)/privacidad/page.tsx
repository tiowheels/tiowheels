import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo Tío Wheels recopila, usa, comparte y protege tus datos personales al comprar o contactarnos.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Política de privacidad"
      updated="septiembre de 2026"
      intro={
        <p>
          En Tío Wheels, nos dedicamos a ofrecerte los mejores autos de juguete de colección mientras protegemos tu privacidad y la seguridad de tu información personal. Esta Política de Privacidad explica cómo recopilamos, utilizamos, compartimos y protegemos los datos que nos proporcionas al interactuar con nosotros, ya sea a través de nuestro sitio web, correos electrónicos o cualquier otro medio. Te invitamos a leer este documento cuidadosamente para que comprendas nuestras prácticas.
        </p>
      }
    >
      <LegalSection n={1} title="Información que recopilamos">
        <p>Recopilamos información personal que tú nos proporcionas directamente y cierta información generada automáticamente cuando usas nuestros servicios. Esto incluye:</p>
        <ul>
          <li>
            <b>Datos que nos das al comprar o contactarnos:</b>
            <ul>
              <li>Nombre completo.</li>
              <li>Dirección de envío o facturación.</li>
              <li>Correo electrónico.</li>
              <li>Número de teléfono.</li>
              <li>Información de pago (como datos de tarjeta procesados por plataformas seguras).</li>
            </ul>
          </li>
          <li>
            <b>Datos recopilados automáticamente:</b>
            <ul>
              <li>Dirección IP, tipo de dispositivo y navegador al visitar nuestro sitio web.</li>
              <li>Preferencias de navegación en nuestra tienda en línea (por ejemplo, productos vistos o añadidos al carrito).</li>
            </ul>
          </li>
          <li>
            <b>Datos opcionales:</b>
            <ul>
              <li>Comentarios, reseñas o mensajes que nos envíes.</li>
            </ul>
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={2} title="¿Cómo usamos tu información?">
        <p>Utilizamos tus datos para:</p>
        <ul>
          <li>Procesar y enviar tus pedidos de autos de juguete de colección.</li>
          <li>Comunicarnos contigo sobre tu compra (confirmaciones, actualizaciones de envío, etc.).</li>
          <li>Responder a tus consultas o solicitudes de atención al cliente.</li>
          <li>Mejorar nuestros productos y servicios analizando cómo interactúas con nuestro sitio.</li>
          <li>Enviarte promociones, descuentos u ofertas especiales (solo si aceptas recibirlas).</li>
          <li>Cumplir con obligaciones legales o fiscales aplicables.</li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="¿Con quién compartimos tu información?">
        <p>No vendemos ni alquilamos tu información personal a terceros. Sin embargo, podemos compartirla en estos casos:</p>
        <ul>
          <li>
            <b>Proveedores de servicios:</b> con empresas que nos ayudan a operar, como servicios de envío (couriers), procesadores de pagos (como Flow y Webpay) o plataformas de hosting web. Estos socios solo usan tus datos para cumplir con su función y están obligados a protegerlos.
          </li>
          <li>
            <b>Cumplimiento legal:</b> si una autoridad competente lo requiere por ley o para proteger nuestros derechos.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="¿Cómo protegemos tu información?">
        <p>En Tío Wheels tomamos medidas razonables para proteger tus datos, como:</p>
        <ul>
          <li>Uso de conexiones seguras (SSL) en nuestro sitio web.</li>
          <li>Almacenamiento de datos en servidores protegidos.</li>
          <li>Acceso restringido a tu información solo para personal autorizado.</li>
        </ul>
        <p>Aun así, ningún sistema es 100% infalible, por lo que te recomendamos tomar precauciones, como no compartir tus contraseñas.</p>
      </LegalSection>

      <LegalSection n={5} title="Tus derechos">
        <p>Dependiendo de las leyes aplicables, puedes tener derechos sobre tus datos, como:</p>
        <ul>
          <li>Acceder a la información que tenemos sobre ti.</li>
          <li>Solicitar que corrijamos datos incorrectos.</li>
          <li>Pedir que eliminemos tus datos (salvo que debamos conservarlos por motivos legales).</li>
          <li>Oponerte a recibir comunicaciones promocionales (puedes darte de baja en cualquier momento).</li>
        </ul>
        <p>
          Para ejercer estos derechos, contáctanos en <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Cookies y tecnologías similares">
        <p>Nuestro sitio web usa cookies para mejorar tu experiencia, como recordar tu carrito de compras o analizar el tráfico. Puedes ajustar la configuración de tu navegador para desactivarlas, pero esto podría limitar algunas funciones de la tienda.</p>
      </LegalSection>

      <LegalSection n={7} title="Menores de edad">
        <p>Nuestros servicios no están dirigidos a menores de 13 años. Si descubrimos que hemos recopilado datos de un menor sin el consentimiento de sus padres, los eliminaremos de inmediato.</p>
      </LegalSection>

      <LegalSection n={8} title="Cambios a esta política">
        <p>Podemos actualizar esta Política de Privacidad en el futuro. Si hay cambios importantes, te notificaremos por correo o mediante un aviso en nuestro sitio web.</p>
      </LegalSection>

      <LegalSection n={9} title="Contacto">
        <p>Si tienes preguntas, comentarios o quieres ejercer tus derechos, contáctanos en:</p>
        <ul>
          <li>
            Correo electrónico: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </li>
          <li>
            Teléfono / WhatsApp: <a href={`https://wa.me/${SITE.whatsapp}`}>{SITE.phone}</a>
          </li>
        </ul>
        <p>En Tío Wheels, tu confianza es lo primero. Gracias por elegirnos para compartir tu pasión por los autos de juguete de colección.</p>
      </LegalSection>
    </LegalPage>
  );
}
