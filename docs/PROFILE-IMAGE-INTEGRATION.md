# Professional Profile Image Integration

The frontend is ready to display a real professional image returned by the backend. Every professional record includes an optional `imageUrl` field.

## Expected backend response

```json
{
  "id": "professional-uuid",
  "name": "Dr. Ahmed Raza",
  "imageUrl": "https://your-storage.example/profiles/professional-uuid.webp",
  "role": "Companion Animal Medicine",
  "city": "Lahore",
  "species": "Pets"
}
```

When `imageUrl` contains a valid image URL, the frontend displays the photograph. When it is empty or `null`, the professional's initials remain visible as a safe fallback.

## Upload rules

- Recommended format: WebP or high-quality JPEG
- Recommended dimensions: 800 × 800 pixels or larger, square crop
- Maximum recommended file size: 2 MB
- Store only approved professional photographs
- Keep the person's real face, identity, features, skin tone and natural appearance unchanged
- Use alt text containing the professional's name and role
- Public profile images may use public URLs; private documents must remain in private storage

The current demo records intentionally use `imageUrl: null` because no approved professional photographs were supplied.
