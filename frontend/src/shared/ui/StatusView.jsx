export function StatusView({ title, message, action }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      {message ? <p>{message}</p> : null}
      {action ? <div className="actions">{action}</div> : null}
    </section>
  )
}
