const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'pages', 'Admin.tsx');
let content = fs.readFileSync(file, 'utf8');

const replacements = {
  "'Error al guardar'": "'Error saving'",
  "'Error al cargar pedidos'": "'Error loading orders'",
  "'Error al actualizar estado'": "'Error updating status'",
  "'Error al cargar productos'": "'Error loading products'",
  "'Error al cargar carrusel'": "'Error loading carousel'",
  "'Error al cargar servicios'": "'Error loading services'",
  "'Error al actualizar'": "'Error updating'",
  "'Error al crear'": "'Error creating'",
  "'Error al eliminar'": "'Error deleting'",
  "'Error al cargar banners'": "'Error loading banners'",
  "'Error al cargar categorías'": "'Error loading categories'",
  "'Error al cargar grupos'": "'Error loading groups'",
  "'Error al cargar ofertas'": "'Error loading offers'",
  "'Error al crear el producto'": "'Error creating product'",
  "'Error al reordenar'": "'Error reordering'",
  "'¿Cancelar este pedido?'": "'Cancel this order?'",
  "Guardar Pie de Página": "Save Footer",
  "Guardar Términos": "Save Terms",
  "Guardar Política": "Save Policy",
  "Guardar Servicios": "Save Services",
  "Guardar Contacto": "Save Contact",
  "Guardar Equipo Pesado": "Save Heavy Equipment",
  "¿Eliminar esta categoría?": "Delete this category?",
  "¿Eliminar este grupo de filtro?": "Delete this filter group?",
  "El banner se eliminará de la sección promocional de la portada.": "The banner will be removed from the promotional section on the homepage.",
  "La imagen se eliminará del carrusel de la portada. Esta acción no se puede deshacer.": "The image will be removed from the homepage carousel. This action cannot be undone.",
  "¿Eliminar esta oferta?": "Delete this offer?",
  "¿Eliminar producto?": "Delete product?",
  "Se eliminará": "Will be deleted",
  "Esta acción no se puede deshacer.": "This action cannot be undone.",
  "'Eliminar'": "'Delete'",
  "¿Eliminar servicio?": "Delete service?"
};

for (const [es, en] of Object.entries(replacements)) {
  content = content.split(es).join(en);
}

// Additional regex replacements for dynamic strings
content = content.replace(/Error al actualizar \(/g, 'Error updating (');
content = content.replace(/Error al crear \(/g, 'Error creating (');

fs.writeFileSync(file, content);
console.log('Translations applied successfully.');
