export interface PrescriptionResponse {
  id: string;
  userId: string;
  orderId?: string | null;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  createdAt: string;
}

export async function uploadPrescriptionApi(
  userId: string,
  file: File
): Promise<PrescriptionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `http://localhost:4000/prescriptions/upload?userId=${userId}`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || 'Prescription file upload karne me masla aaya.'
    );
  }

  return response.json();
}

export async function analyzePrescriptionApi(
  userId: string,
  file: File
): Promise<{ prescription: PrescriptionResponse; detectedProducts: any[] }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `http://localhost:4000/prescriptions/analyze?userId=${userId}`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Prescription analyze karne me masla aaya.');
  }

  return response.json();
}

// 👈 NAYA API HELPER: Existing ID se analyze karna
export async function analyzeExistingPrescriptionApi(
  id: string,
  userId: string
): Promise<{ prescription: PrescriptionResponse; detectedProducts: any[] }> {
  const response = await fetch(
    `http://localhost:4000/prescriptions/${id}/analyze?userId=${userId}`,
    {
      method: 'POST',
    }
  );

  if (!response.ok) {
    throw new Error('Past prescription analyze karne me masla aaya.');
  }

  return response.json();
}

export async function getUserPrescriptionsApi(
  userId: string,
  unattached = false
): Promise<PrescriptionResponse[]> {
  const url = `http://localhost:4000/prescriptions?userId=${userId}${
    unattached ? '&unattached=true' : ''
  }`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Prescriptions fetch nahi ho sakein.');
  }

  return response.json();
}

export async function deletePrescriptionApi(
  id: string,
  userId: string
): Promise<{ message?: string }> {
  const response = await fetch(
    `http://localhost:4000/prescriptions/${id}?userId=${userId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Prescription delete nahi ho saki.');
  }

  return response.json();
}