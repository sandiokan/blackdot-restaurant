# BLACKDOT Studio — Gestione branding ristorante

Questa procedura è riservata a un amministratore tecnico con privilegi amministrativi reali sul progetto Supabase BLACKDOT. Non va eseguita da browser autenticati come OWNER, MANAGER o EMPLOYEE e non richiede modifiche al frontend o una nuova pubblicazione.

## 1. Identificare il ristorante

Nel SQL Editor Supabase, con privilegi amministrativi, recuperare l’UUID del ristorante:

```sql
select id, name
from public.restaurants
where id = '<restaurant_id>'::uuid;
```

Usare sempre l’UUID verificato come primo segmento del percorso Storage.

## 2. Aggiornare nome, colori e modalità

Eseguire una sola upsert con i valori validati (`#RRGGBB`, modalità `DARK` o `LIGHT`):

```sql
insert into public.restaurant_branding (
  restaurant_id,
  display_name,
  logo_path,
  theme_mode,
  primary_color,
  secondary_color,
  updated_at
)
values (
  '<restaurant_id>'::uuid,
  '<nome_commerciale>',
  '<restaurant_id>/logo.png', -- usare NULL se non esiste un logo
  'DARK',
  '#EEB36D',
  '#F5CD96',
  now()
)
on conflict (restaurant_id) do update
set display_name = excluded.display_name,
    logo_path = excluded.logo_path,
    theme_mode = excluded.theme_mode,
    primary_color = excluded.primary_color,
    secondary_color = excluded.secondary_color,
    updated_at = now();
```

Se non si modifica il logo, mantenere il `logo_path` esistente. Se non deve essere visualizzato un logo, impostare `logo_path = NULL`.

## 3. Caricare o sostituire il logo

Da **Supabase Dashboard → Storage → `restaurant-brand-assets`**, caricare un file nel percorso:

```text
<restaurant_id>/logo.png
```

Il bucket è privato. Accettare esclusivamente PNG, JPEG o WebP, con dimensione massima di 2 MB. Per JPEG o WebP aggiornare sia il nome file del percorso sia `logo_path` nel record branding (`logo.jpg` o `logo.webp`).

Per una sostituzione, caricare sullo stesso percorso; per una rimozione, eliminare il file con privilegi amministrativi e aggiornare `logo_path` a `NULL` nella stessa sessione operativa.

## 4. Ripristinare BLACKDOT predefinito

Per tornare al tema nero/oro di fallback, rimuovere il record branding e, se presente, il logo privato:

```sql
delete from public.restaurant_branding
where restaurant_id = '<restaurant_id>'::uuid;
```

Eliminare quindi da Storage l’oggetto `<restaurant_id>/logo.<estensione>`.

## 5. Verificare senza ripubblicare

1. Aprire il sito pubblico del gestionale in una sessione autorizzata per quel ristorante.
2. Ricaricare la pagina o effettuare nuovamente il login: il provider legge `restaurant_branding` all’avvio della sessione.
3. Verificare marchio, colori, modalità e logo nella shell del gestionale.
4. Se l’immagine non viene mostrata, confermare che `logo_path` corrisponda esattamente al percorso privato nel bucket e che l’utente appartenga allo stesso `restaurant_id`.

La pubblicazione WebDev non è necessaria: la configurazione viene letta direttamente da Supabase.
