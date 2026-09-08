import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: "Condiciones de compra en Tío Wheels: precios en pesos chilenos, medios de pago, envíos a todo Chile, devoluciones y contacto.",
  alternates: { canonical: "/terminos" },
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Términos y condiciones"
      updated="septiembre de 2026"
      intro={
        <p>
          Bienvenido a Tío Wheels. Al comprar nuestros autos de juguete de colección o utilizar nuestro sitio web <a href="https://www.tiowheels.cl">www.tiowheels.cl</a>, aceptas cumplir con los siguientes Términos y Condiciones. Te recomendamos leerlos cuidadosamente antes de realizar cualquier compra o interactuar con nuestros servicios. Si no estás de acuerdo con estos términos, por favor, no utilices nuestros servicios.
        </p>
      }
    >
      <LegalSection n={1} title="Generalidades">
        <ul>
          <li>Tío Wheels es una empresa dedicada a la venta de autos de juguete de colección para entusiastas y coleccionistas.</li>
          <li>Estos términos aplican a todas las compras realizadas en nuestra tienda en línea o en cualquier otro canal oficial de venta.</li>
          <li>Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán efectivos al publicarse en nuestro sitio web, y te notificaremos si son significativos.</li>
        </ul>
      </LegalSection>

      <LegalSection n={2} title="Productos y precios">
        <ul>
          <li>
            <b>Descripción:</b> nos esforzamos por describir nuestros productos con precisión (tamaño, material, color, etc.), pero las imágenes y detalles son referenciales. Pequeñas variaciones pueden ocurrir debido a la naturaleza de los productos.
          </li>
          <li>
            <b>Precios:</b> todos los precios están en pesos chilenos (CLP) y se indican claramente antes de finalizar tu compra. Incluyen los impuestos aplicables, salvo que se especifique lo contrario. Los costos de envío se calculan por separado.
          </li>
          <li>
            <b>Disponibilidad:</b> los productos están sujetos a disponibilidad. Si un artículo se agota después de tu pedido, te notificaremos y ofreceremos un reembolso o cambio.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Proceso de compra">
        <ul>
          <li>
            <b>Pedidos:</b> para comprar, selecciona los productos, proporciona la información solicitada (dirección, datos de pago, etc.) y confirma tu pedido.
          </li>
          <li>
            <b>Confirmación:</b> recibirás un correo electrónico confirmando tu pedido. Esto no garantiza la disponibilidad hasta que procesemos el pago y preparemos el envío.
          </li>
          <li>
            <b>Cancelaciones:</b> puedes cancelar tu pedido antes de que sea enviado contactándonos en <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Una vez enviado, aplica la política de devoluciones (ver sección 6).
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Pago">
        <ul>
          <li>Aceptamos pagos a través de Flow (Webpay, tarjetas de crédito y débito) y transferencia bancaria.</li>
          <li>El pago debe completarse en su totalidad antes del envío. Si hay problemas con el pago, nos reservamos el derecho de cancelar el pedido.</li>
          <li>Los datos de pago son procesados por plataformas seguras de terceros (como Flow y Webpay). No almacenamos información de tarjetas en nuestros servidores.</li>
        </ul>
      </LegalSection>

      <LegalSection n={5} title="Envíos">
        <ul>
          <li>
            <b>Tiempos:</b> los pedidos se procesan en 1 a 3 días hábiles y el envío tarda entre 2 y 7 días hábiles, según tu ubicación.
          </li>
          <li>
            <b>Costos:</b> el envío es por pagar. El costo depende del destino y del peso del paquete, y se cancela directamente al courier (Starken u otros) al recibir tu pedido. También puedes coordinar el retiro sin costo.
          </li>
          <li>
            <b>Responsabilidad:</b> nos encargamos de que tu pedido salga en perfectas condiciones. Una vez entregado al courier, no somos responsables por retrasos o daños causados por el transportista, pero te ayudaremos a resolver cualquier problema.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={6} title="Devoluciones y reembolsos">
        <ul>
          <li>
            <b>Plazo:</b> aceptamos devoluciones dentro de los 10 días siguientes a la entrega, siempre que el producto esté sin usar, en su empaque original y en las mismas condiciones en que lo recibiste.
          </li>
          <li>
            <b>Proceso:</b> contáctanos en <a href={`mailto:${SITE.email}`}>{SITE.email}</a> o por WhatsApp al {SITE.phone} para iniciar una devolución. Debes cubrir los costos de envío de retorno, salvo que el producto esté defectuoso o sea un error nuestro.
          </li>
          <li>
            <b>Reembolsos:</b> se procesan en 5 a 10 días hábiles tras recibir y verificar el producto devuelto. Se realizarán al mismo método de pago original.
          </li>
          <li>
            <b>Excepciones:</b> no se aceptan devoluciones de productos personalizados o en oferta especial, salvo defectos de fabricación.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={7} title="Propiedad intelectual">
        <ul>
          <li>Todas las imágenes, logotipos y contenidos de nuestro sitio web son propiedad de Tío Wheels o de nuestros socios. No puedes usarlos sin nuestro permiso expreso.</li>
        </ul>
      </LegalSection>

      <LegalSection n={8} title="Limitación de responsabilidad">
        <ul>
          <li>Vendemos autos de juguete de colección para uso decorativo o recreativo. No nos responsabilizamos por el uso indebido de los productos o por daños causados por terceros.</li>
          <li>Nuestro sitio web y servicios se ofrecen «tal como están». No garantizamos que estén libres de errores o interrupciones.</li>
        </ul>
      </LegalSection>

      <LegalSection n={9} title="Ley aplicable">
        <ul>
          <li>Estos términos se rigen por las leyes de la República de Chile. Cualquier disputa se resolverá ante los tribunales competentes de Chile.</li>
        </ul>
      </LegalSection>

      <LegalSection n={10} title="Contacto">
        <p>Para dudas, quejas o aclaraciones, contáctanos en:</p>
        <ul>
          <li>
            Correo: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </li>
          <li>
            WhatsApp: <a href={`https://wa.me/${SITE.whatsapp}`}>{SITE.phone}</a>
          </li>
        </ul>
        <p>Gracias por elegir Tío Wheels. ¡Esperamos que disfrutes tu colección!</p>
      </LegalSection>
    </LegalPage>
  );
}
