class ChangelogController < ApplicationController
  # GET /changelog
  def index
    @changelog = MarkdownHelper.get_changelog

    respond_to do |format|
      format.html # render view
      format.json { render json: @changelog }
    end
  end
end
