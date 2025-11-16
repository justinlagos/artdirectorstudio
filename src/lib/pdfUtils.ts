/**
 * Lazy-load jsPDF to reduce initial bundle size
 * This utility ensures jsPDF is only loaded when needed
 */

let jsPDFModule: typeof import('jspdf') | null = null;

export async function getJsPDF(): Promise<typeof import('jspdf')> {
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf');
  }
  return jsPDFModule;
}

/**
 * Create a new jsPDF instance (lazy loaded)
 */
export async function createPDF(): Promise<InstanceType<typeof import('jspdf').default>> {
  const jsPDF = await getJsPDF();
  return new jsPDF.default();
}

