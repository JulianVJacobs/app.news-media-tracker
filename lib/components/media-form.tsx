'use client';

import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';

interface MediaItem {
  id?: string;
  title: string;
  type: string;
  year: number;
  rating: number;
  watched: boolean;
}

interface MediaFormProps {
  show: boolean;
  onHide: () => void;
  onSave: (item: MediaItem) => void;
  item?: MediaItem;
}

const MediaForm: React.FC<MediaFormProps> = ({
  show,
  onHide,
  onSave,
  item,
}) => {
  const [formData, setFormData] = useState<MediaItem>(
    item || {
      title: '',
      type: 'movie',
      year: new Date().getFullYear(),
      rating: 0,
      watched: false,
    },
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    onSave(formData);
    toast.success(`${item ? 'Updated' : 'Added'} media item successfully`);
    onHide();
  };

  const handleChange = <K extends keyof MediaItem>(
    field: K,
    value: MediaItem[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{item ? 'Edit' : 'Add New'} Media Item</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter media title"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Type</Form.Label>
            <Form.Select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              <option value="movie">Movie</option>
              <option value="tv-series">TV Series</option>
              <option value="documentary">Documentary</option>
              <option value="podcast">Podcast</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Year</Form.Label>
            <Form.Control
              type="number"
              value={formData.year}
              onChange={(e) =>
                handleChange('year', Number.parseInt(e.target.value, 10))
              }
              min="1900"
              max={new Date().getFullYear() + 5}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Rating (0-10)</Form.Label>
            <Form.Control
              type="number"
              value={formData.rating}
              onChange={(e) =>
                handleChange('rating', Number.parseFloat(e.target.value))
              }
              min="0"
              max="10"
              step="0.1"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              label="Watched"
              checked={formData.watched}
              onChange={(e) => handleChange('watched', e.target.checked)}
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            {item ? 'Update' : 'Add'} Item
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default MediaForm;
