defmodule Mix.Tasks.RunQcic do
  @moduledoc """
  Mix Task Module
  """
  use Mix.Task

  @shortdoc "Runs the QCIC main function"

  def run(_) do
    Qcic.main()
  end
end
