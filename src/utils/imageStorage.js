const isInlineImage = value =>
  typeof value === 'string' && value.startsWith('data:');

const stripInlineImage = value => (isInlineImage(value) ? null : value);

export function stripConfirmedEvidence(order) {
  if (!order || typeof order !== 'object') return order;

  const photos = order.photos && typeof order.photos === 'object'
    ? {
        ...order.photos,
        before: stripInlineImage(order.photos.before),
        after: stripInlineImage(order.photos.after)
      }
    : order.photos;

  const damagePhotos = Array.isArray(order.damagePhotos)
    ? order.damagePhotos.map(stripInlineImage).filter(Boolean)
    : order.damagePhotos;

  const damage_photos = Array.isArray(order.damage_photos)
    ? order.damage_photos.map(stripInlineImage).filter(Boolean)
    : order.damage_photos;

  const damageReport = order.damageReport && typeof order.damageReport === 'object'
    ? {
        ...order.damageReport,
        damagePhotos: Array.isArray(order.damageReport.damagePhotos)
          ? order.damageReport.damagePhotos.map(stripInlineImage).filter(Boolean)
          : order.damageReport.damagePhotos,
        photo: stripInlineImage(order.damageReport.photo)
      }
    : order.damageReport;

  const damage_report = order.damage_report && typeof order.damage_report === 'object'
    ? {
        ...order.damage_report,
        damagePhotos: Array.isArray(order.damage_report.damagePhotos)
          ? order.damage_report.damagePhotos.map(stripInlineImage).filter(Boolean)
          : order.damage_report.damagePhotos,
        photo: stripInlineImage(order.damage_report.photo)
      }
    : order.damage_report;

  return {
    ...order,
    photos,
    signature: stripInlineImage(order.signature),
    customer_signature: stripInlineImage(order.customer_signature),
    damagePhotos,
    damage_photos,
    damageReport,
    damage_report
  };
}

export function hasInlineEvidence(order) {
  if (!order || typeof order !== 'object') return false;
  const values = [
    order.photos?.before,
    order.photos?.after,
    order.signature,
    order.customer_signature,
    ...(Array.isArray(order.damagePhotos) ? order.damagePhotos : []),
    ...(Array.isArray(order.damage_photos) ? order.damage_photos : []),
    ...(Array.isArray(order.damageReport?.damagePhotos) ? order.damageReport.damagePhotos : []),
    ...(Array.isArray(order.damage_report?.damagePhotos) ? order.damage_report.damagePhotos : []),
    order.damageReport?.photo,
    order.damage_report?.photo
  ];
  return values.some(isInlineImage);
}
