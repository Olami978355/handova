import React from 'react';
import { useParams } from 'react-router-dom';
import { ListingWizard } from '../components/listing/ListingWizard';

export default function EditListing() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <ListingWizard propertyId={id} />;
}
