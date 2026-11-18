/**
 * Forms ([data-form] = contact | newsletter | receipt): validates in the browser with the
 * same rules and messages as public/lib/form-handler.php (the server stays the source of
 * truth), shows errors inline and in a summary that receives focus, then sends with fetch
 * and reports the result in the form's status region. Without JavaScript the forms post
 * normally and the server redirects.
 */
type Errors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9 +()-]{7,30}$/;
const TAX = /^[0-9 ]{1,20}$/;
const AMOUNT = /^\d{1,9}([.,]\d{1,2})?$/;
const FALLBACK = 'know@pholoso.africa';

function value(data: FormData, name: string): string {
  const v = data.get(name);
  return typeof v === 'string' ? v.trim() : '';
}

function validDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const real = d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
  return real && d.getTime() <= Date.now() + 86_400_000;
}

/** Mirrors paf_validate() in public/lib/form-handler.php. */
export function validate(type: string, data: FormData, form?: HTMLFormElement): Errors {
  const e: Errors = {};
  const tooLong = (name: string, v: string) => {
    const max = Number(form?.querySelector<HTMLInputElement>(`[name="${name}"]`)?.maxLength ?? -1);
    return max > 0 && [...v].length > max;
  };
  const email = value(data, 'email');
  if (!email) e.email = 'Enter your email address.';
  else if (!EMAIL.test(email) || tooLong('email', email))
    e.email = 'Enter a valid email address, like name@example.com.';
  const consent = data.get('consent') === 'yes';

  if (type === 'newsletter') {
    if (!consent) e.consent = 'Tick the box to agree to receive emails.';
    return e;
  }
  if (type === 'contact') {
    if (!value(data, 'topic')) e.topic = 'Choose what your message is about.';
    if (tooLong('name', value(data, 'name'))) e.name = 'Keep your name under 100 characters.';
    const message = value(data, 'message');
    if (!message) e.message = 'Write your message.';
    else if (tooLong('message', message)) e.message = 'Keep your message under 5000 characters.';
    if (!consent) e.consent = 'Tick the box to agree that we may use your details to reply.';
    return e;
  }
  // receipt
  if (!value(data, 'donorType')) e.donorType = 'Choose who made the donation.';
  const required: Record<string, string> = {
    donorName: 'Enter the full or registered name.',
    idNumber: 'Enter the ID, passport or registration number.',
    address: 'Enter the address.',
    phone: 'Enter a phone number.',
    reference: 'Enter the payment reference you used.',
  };
  for (const [k, msg] of Object.entries(required)) if (!value(data, k)) e[k] = msg;
  for (const k of [
    'donorName',
    'tradingName',
    'idNumber',
    'taxNumber',
    'address',
    'phone',
    'reference',
    'notes',
  ]) {
    if (!e[k] && tooLong(k, value(data, k))) e[k] = 'This answer is too long.';
  }
  const phone = value(data, 'phone');
  if (!e.phone && !PHONE.test(phone))
    e.phone = 'Enter a phone number using numbers, spaces and + only.';
  const tax = value(data, 'taxNumber');
  if (tax && !e.taxNumber && !TAX.test(tax))
    e.taxNumber = 'Enter the income tax number using numbers only.';
  const amountRaw = value(data, 'amount');
  const amount = amountRaw.replace(/\s+/g, '').replace(/^R/i, '');
  if (!amountRaw) e.amount = 'Enter the amount you donated.';
  else if (!AMOUNT.test(amount) || Number(amount.replace(',', '.')) <= 0)
    e.amount = 'Enter the amount in rand, like 500 or 1250.50.';
  const date = value(data, 'datePaid');
  if (!date) e.datePaid = 'Enter the date you paid.';
  else if (!validDate(date)) e.datePaid = 'Enter a real date that is not in the future.';
  if (!consent) e.consent = 'Tick the box to agree that we may use these details for your receipt.';
  return e;
}

/** The element that carries a field's error: a single control, or a radio group's fieldset. */
function holder(
  form: HTMLFormElement,
  name: string,
): { box: HTMLElement; focus: HTMLElement } | null {
  const group = form.querySelector<HTMLElement>(`[data-choice-group="${name}"]`);
  if (group) {
    const first = group.querySelector<HTMLElement>('input');
    return first ? { box: group, focus: first } : null;
  }
  const control = form.querySelector<HTMLElement>(`[name="${name}"]:not([type="hidden"])`);
  return control ? { box: control, focus: control } : null;
}

function describedBy(el: HTMLElement, add: string | undefined, remove: string | undefined): void {
  const ids = new Set((el.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
  if (remove) ids.delete(remove);
  if (add) ids.add(add);
  if (ids.size) el.setAttribute('aria-describedby', [...ids].join(' '));
  else el.removeAttribute('aria-describedby');
}

function clearErrors(form: HTMLFormElement): void {
  form.querySelectorAll<HTMLElement>('[data-error-id]').forEach((el) => {
    const errorId = el.dataset.errorId;
    const msg = errorId ? document.getElementById(errorId) : null;
    if (msg) msg.hidden = true;
    el.removeAttribute('aria-invalid');
    describedBy(el, undefined, errorId);
  });
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  const summary = form.querySelector<HTMLElement>('[data-error-summary]');
  if (summary) summary.hidden = true;
}

function showErrors(form: HTMLFormElement, errors: Errors): void {
  const summary = form.querySelector<HTMLElement>('[data-error-summary]');
  const list = summary?.querySelector('ul');
  list?.replaceChildren();
  for (const [name, message] of Object.entries(errors)) {
    const h = holder(form, name);
    if (!h) continue;
    const errorId = h.box.dataset.errorId;
    const msg = errorId ? document.getElementById(errorId) : null;
    const text = msg?.querySelector('.field__error-text');
    if (msg && text) {
      text.textContent = message;
      msg.hidden = false;
      describedBy(h.box, errorId, undefined);
    }
    (h.box.matches('fieldset') ? h.box.querySelectorAll('input') : [h.box]).forEach((el) =>
      el.setAttribute('aria-invalid', 'true'),
    );
    if (list) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `#${h.focus.id}`;
      a.textContent = message;
      a.addEventListener('click', (event) => {
        event.preventDefault();
        h.focus.focus();
        h.focus.scrollIntoView({ block: 'center' });
      });
      li.append(a);
      list.append(li);
    }
  }
  if (summary) {
    summary.hidden = false;
    summary.focus();
  }
}

function setStatus(
  form: HTMLFormElement,
  state: 'sending' | 'success' | 'error',
  message: string,
): void {
  const status = form.querySelector<HTMLElement>('[role="status"]');
  if (!status) return;
  status.dataset.state = state;
  status.textContent = message;
}

export function initForms(): void {
  const forms = document.querySelectorAll<HTMLFormElement>('form[data-form]');
  if (!forms.length) return;
  const started = Date.now();

  // /contact/?topic=story preselects the topic
  const topic = new URLSearchParams(window.location.search).get('topic');
  const select = document.querySelector<HTMLSelectElement>('#contact-form select[name="topic"]');
  if (topic && select && [...select.options].some((o) => o.value === topic)) select.value = topic;

  forms.forEach((form) => {
    form.noValidate = true;
    const type = form.dataset.form ?? '';
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearErrors(form);
      const data = new FormData(form);
      const errors = validate(type, data, form);
      if (Object.keys(errors).length) {
        showErrors(form, errors);
        return;
      }
      data.set('elapsed', String((Date.now() - started) / 1000));
      if (button) button.disabled = true;
      setStatus(form, 'sending', 'Sending…');
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        });
        const result = (await response.json()) as { ok: boolean; message: string; errors?: Errors };
        if (result.ok) {
          form.reset();
          setStatus(form, 'success', result.message);
        } else if (result.errors && Object.keys(result.errors).length) {
          setStatus(form, 'error', result.message);
          showErrors(form, result.errors);
        } else {
          setStatus(
            form,
            'error',
            result.message || `We could not send your form. Please email ${FALLBACK}.`,
          );
        }
      } catch {
        setStatus(
          form,
          'error',
          `We could not send your form. Please check your connection and try again, or email ${FALLBACK}.`,
        );
      } finally {
        if (button) button.disabled = false;
      }
    });
  });
}
