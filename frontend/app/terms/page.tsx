export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>
      <div className="prose prose-sm mt-6 max-w-none text-zinc-700 dark:prose-invert dark:text-zinc-300">
        <section className="mt-6">
          <h2 className="text-xl font-semibold">1. Chấp nhận điều khoản</h2>
          <p className="mt-2">
            Bằng việc truy cập và sử dụng dịch vụ BesideAI, bạn đồng ý tuân thủ
            và bị ràng buộc bởi các điều khoản và điều kiện này. Nếu bạn không
            đồng ý với bất kỳ phần nào của các điều khoản này, bạn không được
            phép sử dụng dịch vụ của chúng tôi.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">2. Mô tả dịch vụ</h2>
          <p className="mt-2">
            BesideAI là một Chrome Extension cung cấp các tính năng AI để hỗ
            trợ người dùng trong Gmail, Google Meet, PDF và các ứng dụng khác.
            Dịch vụ bao gồm việc xử lý dữ liệu thông qua các mô hình AI và cung
            cấp kết quả cho người dùng.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">3. Đăng ký và tài khoản</h2>
          <p className="mt-2">
            Để sử dụng một số tính năng của BesideAI, bạn có thể cần tạo tài
            khoản. Bạn có trách nhiệm:
          </p>
          <ul className="mt-2 list-disc pl-6">
            <li>Bảo mật thông tin đăng nhập của bạn</li>
            <li>
              Cung cấp thông tin chính xác và cập nhật khi đăng ký
            </li>
            <li>
              Thông báo ngay cho chúng tôi về bất kỳ vi phạm bảo mật nào
            </li>
            <li>
              Chịu trách nhiệm cho tất cả hoạt động xảy ra dưới tài khoản của
              bạn
            </li>
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">4. Gói subscription và thanh toán</h2>
          <p className="mt-2">
            BesideAI cung cấp các gói subscription (Free, Professional, Premium)
            với các tính năng và giới hạn khác nhau:
          </p>
          <ul className="mt-2 list-disc pl-6">
            <li>
              Thanh toán được xử lý qua Lemon Squeezy, một Merchant of Record
              uy tín
            </li>
            <li>
              Tất cả giá đều được tính bằng USD và có thể bao gồm thuế tùy theo
              khu vực của bạn
            </li>
            <li>
              Bạn có thể hủy subscription bất cứ lúc nào. Gói sẽ tiếp tục hoạt
              động đến hết kỳ thanh toán hiện tại
            </li>
            <li>
              Chúng tôi không hoàn tiền cho các khoản thanh toán đã thực hiện,
              trừ khi có quy định khác theo luật pháp địa phương
            </li>
            <li>
              Chúng tôi có quyền thay đổi giá cả với thông báo trước 30 ngày
            </li>
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">5. Dùng thử miễn phí</h2>
          <p className="mt-2">
            Một số gói subscription có thể bao gồm thời gian dùng thử miễn phí.
            Nếu bạn không hủy trước khi kỳ dùng thử kết thúc, bạn sẽ được tính
            phí theo gói đã chọn.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">6. Sử dụng dịch vụ</h2>
          <p className="mt-2">Bạn đồng ý không sử dụng dịch vụ để:</p>
          <ul className="mt-2 list-disc pl-6">
            <li>Vi phạm bất kỳ luật pháp hoặc quy định nào</li>
            <li>
              Gửi, truyền hoặc chia sẻ nội dung bất hợp pháp, có hại, đe dọa,
              lạm dụng, quấy rối, phỉ báng, khiêu dâm, hoặc vi phạm quyền riêng
              tư
            </li>
            <li>
              Xâm phạm quyền sở hữu trí tuệ của bất kỳ bên thứ ba nào
            </li>
            <li>
              Cố gắng truy cập trái phép vào hệ thống hoặc tài khoản của người
              khác
            </li>
            <li>
              Sử dụng dịch vụ cho mục đích thương mại không được phép hoặc spam
            </li>
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">7. Quyền sở hữu trí tuệ</h2>
          <p className="mt-2">
            Tất cả nội dung, tính năng và chức năng của dịch vụ BesideAI,
            bao gồm nhưng không giới hạn ở văn bản, đồ họa, logo, biểu tượng,
            hình ảnh, và phần mềm, là tài sản của chúng tôi hoặc các nhà cung
            cấp nội dung của chúng tôi và được bảo vệ bởi luật bản quyền và các
            luật sở hữu trí tuệ khác.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">8. Từ chối trách nhiệm</h2>
          <p className="mt-2">
            Dịch vụ được cung cấp "như hiện tại" và "như có sẵn". Chúng tôi
            không đảm bảo rằng dịch vụ sẽ không bị gián đoạn, không có lỗi, hoặc
            đáp ứng mọi yêu cầu của bạn. Chúng tôi không chịu trách nhiệm về
            bất kỳ thiệt hại nào phát sinh từ việc sử dụng hoặc không thể sử dụng
            dịch vụ.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">9. Giới hạn trách nhiệm</h2>
          <p className="mt-2">
            Trong phạm vi tối đa được phép bởi luật pháp, chúng tôi không chịu
            trách nhiệm cho bất kỳ thiệt hại gián tiếp, ngẫu nhiên, đặc biệt,
            hoặc hậu quả nào phát sinh từ việc sử dụng hoặc không thể sử dụng
            dịch vụ của chúng tôi.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">10. Chấm dứt</h2>
          <p className="mt-2">
            Chúng tôi có quyền chấm dứt hoặc tạm ngưng quyền truy cập của bạn
            vào dịch vụ ngay lập tức, không cần thông báo trước, vì bất kỳ lý do
            nào, bao gồm nhưng không giới hạn ở vi phạm các điều khoản này.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">11. Thay đổi điều khoản</h2>
          <p className="mt-2">
            Chúng tôi có quyền sửa đổi các điều khoản này bất cứ lúc nào. Các
            thay đổi sẽ có hiệu lực ngay sau khi được đăng tải. Việc bạn tiếp
            tục sử dụng dịch vụ sau khi các thay đổi có hiệu lực được coi là
            chấp nhận các điều khoản mới.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">12. Luật áp dụng</h2>
          <p className="mt-2">
            Các điều khoản này được điều chỉnh bởi và giải thích theo luật pháp
            của Việt Nam. Bất kỳ tranh chấp nào phát sinh từ hoặc liên quan đến
            các điều khoản này sẽ được giải quyết tại tòa án có thẩm quyền tại
            Việt Nam.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">13. Liên hệ</h2>
          <p className="mt-2">
            Nếu bạn có bất kỳ câu hỏi nào về các điều khoản này, vui lòng liên
            hệ chúng tôi tại{" "}
            <a
              href="mailto:support@besideai.work"
              className="text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
            >
              support@besideai.work
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}


