-- Store the HTML version of emails so the Communications reading pane can
-- render real formatting + images (inbound mail's plain-text alternative is
-- often just long lines of image/link URLs). Falls back to `body` (text) when
-- an email has no HTML part.

alter table messages add column if not exists body_html text;
