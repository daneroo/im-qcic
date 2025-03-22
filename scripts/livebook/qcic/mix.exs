defmodule Qcic.MixProject do
  use Mix.Project

  def project do
    [
      app: :qcic,
      version: "0.1.0",
      elixir: "~> 1.18",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      # extra_applications: [:logger]
      extra_applications: [:telemetry]
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:credo, "~> 1.7"},
      {:gnat, "~> 1.8"},
      {:jason, "~> 1.4"}
      # {:kino_vega_lite, "~> 0.1.11"}
    ]
  end
end
