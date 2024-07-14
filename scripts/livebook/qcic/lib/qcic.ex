defmodule Qcic do
  @moduledoc """
  Documentation for `Qcic`.
  """

  @doc """
  Main function to generate the QCIC report.
  """
  def main() do
    report = show()
    IO.puts(report)
  end

  @doc """
  The report as a string
  """
  def show do
    header = """
    # QCIC - Host Report
    """

    report =
      header <>
        Qcic.Identity.show_identity() <>
        Qcic.TailScale.show_tailscale() <>
        Qcic.Nats.show_nats()

    report
  end
end
