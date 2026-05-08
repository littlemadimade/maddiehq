require 'net/http'
require 'openssl'

module StorageClient
  UPLOADS_DIR = Rails.root.join('data', 'uploads')

  def self.upload(key, data, content_type)
    if s3_configured?
      s3_upload(key, data, content_type)
    else
      local_upload(key, data)
    end
  end

  def self.download(key)
    if s3_configured?
      s3_download(key)
    else
      local_download(key)
    end
  end

  def self.delete(key)
    if s3_configured?
      s3_delete(key)
    else
      local_delete(key)
    end
  end

  def self.url(key)
    if s3_configured?
      "#{ENV['S3_ENDPOINT']}/#{ENV['S3_BUCKET']}/#{key}"
    else
      "/api/files/#{key}"
    end
  end

  def self.generate_key(filename)
    ext = File.extname(filename)
    "#{SecureRandom.hex(8)}#{ext}"
  end

  def self.backend_name
    s3_configured? ? 's3' : 'local'
  end

  private

  def self.s3_configured?
    ENV['S3_ENDPOINT'].present? && ENV['S3_BUCKET'].present? &&
      ENV['S3_ACCESS_KEY'].present? && ENV['S3_SECRET_KEY'].present?
  end

  def self.local_upload(key, data)
    FileUtils.mkdir_p(UPLOADS_DIR)
    File.binwrite(UPLOADS_DIR.join(key), data)
  end

  def self.local_download(key)
    path = UPLOADS_DIR.join(key)
    raise Errors::NotFoundError, "File not found" unless File.exist?(path)
    File.binread(path)
  end

  def self.local_delete(key)
    path = UPLOADS_DIR.join(key)
    File.delete(path) if File.exist?(path)
  end

  def self.s3_upload(key, data, content_type)
    uri = URI("#{ENV['S3_ENDPOINT']}/#{ENV['S3_BUCKET']}/#{key}")
    date = Time.now.utc.httpdate
    string_to_sign = "PUT\n\n#{content_type}\n#{date}\n/#{ENV['S3_BUCKET']}/#{key}"
    signature = Base64.strict_encode64(
      OpenSSL::HMAC.digest('sha1', ENV['S3_SECRET_KEY'], string_to_sign)
    )

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == 'https'
    req = Net::HTTP::Put.new(uri.path)
    req['Content-Type'] = content_type
    req['Date'] = date
    req['Authorization'] = "AWS #{ENV['S3_ACCESS_KEY']}:#{signature}"
    req.body = data

    res = http.request(req)
    raise "S3 upload failed: #{res.code}" unless res.is_a?(Net::HTTPSuccess)
  end

  def self.s3_download(key)
    uri = URI("#{ENV['S3_ENDPOINT']}/#{ENV['S3_BUCKET']}/#{key}")
    date = Time.now.utc.httpdate
    string_to_sign = "GET\n\n\n#{date}\n/#{ENV['S3_BUCKET']}/#{key}"
    signature = Base64.strict_encode64(
      OpenSSL::HMAC.digest('sha1', ENV['S3_SECRET_KEY'], string_to_sign)
    )

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == 'https'
    req = Net::HTTP::Get.new(uri.path)
    req['Date'] = date
    req['Authorization'] = "AWS #{ENV['S3_ACCESS_KEY']}:#{signature}"

    res = http.request(req)
    raise Errors::NotFoundError, "File not found" unless res.is_a?(Net::HTTPSuccess)
    res.body
  end

  def self.s3_delete(key)
    uri = URI("#{ENV['S3_ENDPOINT']}/#{ENV['S3_BUCKET']}/#{key}")
    date = Time.now.utc.httpdate
    string_to_sign = "DELETE\n\n\n#{date}\n/#{ENV['S3_BUCKET']}/#{key}"
    signature = Base64.strict_encode64(
      OpenSSL::HMAC.digest('sha1', ENV['S3_SECRET_KEY'], string_to_sign)
    )

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == 'https'
    req = Net::HTTP::Delete.new(uri.path)
    req['Date'] = date
    req['Authorization'] = "AWS #{ENV['S3_ACCESS_KEY']}:#{signature}"

    http.request(req)
  end
end
