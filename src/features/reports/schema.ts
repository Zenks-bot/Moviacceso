import { z } from 'zod';
import { PILOT_BOUNDS } from '../../data/demo-dataset';
import { REPORT_CATEGORIES } from '../../types/domain';

/** Validación del formulario de reporte (cliente). El servidor repite estas validaciones en submit_report(). */
export const reportFormSchema = z.object({
  latitude: z
    .number({ message: 'Seleccione la ubicación del problema en el mapa o elija un tramo de la lista.' })
    .min(PILOT_BOUNDS.minLat, { message: 'La ubicación debe estar dentro del sector piloto.' })
    .max(PILOT_BOUNDS.maxLat, { message: 'La ubicación debe estar dentro del sector piloto.' }),
  longitude: z
    .number({ message: 'Seleccione la ubicación del problema en el mapa o elija un tramo de la lista.' })
    .min(PILOT_BOUNDS.minLng, { message: 'La ubicación debe estar dentro del sector piloto.' })
    .max(PILOT_BOUNDS.maxLng, { message: 'La ubicación debe estar dentro del sector piloto.' }),
  graphEdgeId: z.string().nullable(),
  category: z.enum(REPORT_CATEGORIES, { message: 'Elija el tipo de problema.' }),
  description: z
    .string()
    .trim()
    .min(10, { message: 'Describa el problema con al menos 10 caracteres (por ejemplo, qué lo bloquea y dónde exactamente).' })
    .max(1000, { message: 'La descripción no puede superar los 1000 caracteres.' })
    .refine((v) => !/\b\d{8}\b/.test(v), { message: 'No incluya números de documento de identidad ni datos personales.' })
    .refine((v) => !/(\+?51)?\s?9\d{2}[\s-]?\d{3}[\s-]?\d{3}/.test(v), { message: 'No incluya números de teléfono ni datos personales.' }),
  severity: z.coerce.number({ message: 'Indique el nivel de dificultad percibida.' }).int().min(1, { message: 'Indique el nivel de dificultad percibida.' }).max(5),
  acceptTerms: z.literal(true, { message: 'Debe aceptar las condiciones de uso para enviar el reporte.' }),
  /** Campo trampa (oculto) para bots: debe quedar vacío. */
  website: z.string().max(0, { message: 'No se pudo validar el formulario.' }),
});

export type ReportFormValues = z.infer<typeof reportFormSchema>;
export type ReportFormInput = z.input<typeof reportFormSchema>;
